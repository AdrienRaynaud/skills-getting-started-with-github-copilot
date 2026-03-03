import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities

# snapshot of original state
ORIGINAL_ACTIVITIES = copy.deepcopy(activities)

@pytest.fixture(autouse=True)
def reset_activities():
    """
    Restore the activities dict before each test so every test
    starts from a known good state.
    """
    activities.clear()
    activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))
    yield


client = TestClient(app)


def test_root_redirect():
    # Arrange – no setup needed beyond client
    # Act
    response = client.get("/", follow_redirects=False)
    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_snapshot():
    # Arrange – original snapshot already in scope
    # Act
    response = client.get("/activities")
    # Assert
    assert response.status_code == 200
    assert response.json() == ORIGINAL_ACTIVITIES


def test_post_signup_success():
    # Arrange
    activity = "Chess Club"
    new_email = "newstudent@mergington.edu"
    assert new_email not in activities[activity]["participants"]
    # Act
    response = client.post(f"/activities/{activity}/signup", params={"email": new_email})
    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {new_email} for {activity}"}
    assert new_email in activities[activity]["participants"]


def test_post_signup_duplicate_email():
    # Arrange
    activity = "Chess Club"
    existing = activities[activity]["participants"][0]
    # Act
    response = client.post(f"/activities/{activity}/signup", params={"email": existing})
    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"


def test_post_signup_unknown_activity():
    # Arrange
    bad_activity = "Nonexistent Activity"
    new_email = "foo@bar.com"
    # Act
    response = client.post(f"/activities/{bad_activity}/signup", params={"email": new_email})
    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_delete_participant_success():
    # Arrange
    activity = "Chess Club"
    email = activities[activity]["participants"][0]
    assert email in activities[activity]["participants"]
    # Act
    response = client.delete(f"/activities/{activity}/participants", params={"email": email})
    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Removed {email} from {activity}"}
    assert email not in activities[activity]["participants"]


def test_delete_unknown_activity():
    # Arrange
    bad_activity = "No Club"
    email = "ghost@mergington.edu"
    # Act
    response = client.delete(f"/activities/{bad_activity}/participants", params={"email": email})
    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_delete_email_not_in_participants():
    # Arrange
    activity = "Chess Club"
    missing_email = "absent@mergington.edu"
    assert missing_email not in activities[activity]["participants"]
    # Act
    response = client.delete(f"/activities/{activity}/participants", params={"email": missing_email})
    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student not found in activity"