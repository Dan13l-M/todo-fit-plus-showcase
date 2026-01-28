#!/usr/bin/env python3
"""
Backend API Testing Script for ToDoApp Plus - Fitness API
Tests all major endpoints with realistic data
"""

import requests
import json
import time
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://todofit.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test data
TEST_USER = {
    "email": "sarah.johnson@email.com",
    "username": "sarah_fit",
    "password": "SecurePass123!",
    "full_name": "Sarah Johnson"
}

TEST_LOGIN = {
    "email": "sarah.johnson@email.com", 
    "password": "SecurePass123!"
}

# Global variables to store test data
auth_token = None
user_id = None
routine_id = None
session_id = None
exercise_ids = []

def log_test(test_name, success, details=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   {details}")
    if not success:
        print(f"   Response: {details}")

def make_request(method, endpoint, data=None, auth=False):
    """Make HTTP request with proper headers"""
    url = f"{BASE_URL}{endpoint}"
    headers = HEADERS.copy()
    
    if auth and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def test_health_check():
    """Test basic health endpoint"""
    print("\n=== HEALTH CHECK ===")
    
    response = make_request("GET", "/health")
    if response and response.status_code == 200:
        log_test("Health Check", True, "API is responding")
        return True
    else:
        log_test("Health Check", False, f"Status: {response.status_code if response else 'No response'}")
        return False

def test_seed_exercises():
    """Seed exercises if database is empty"""
    print("\n=== SEEDING EXERCISES ===")
    
    response = make_request("POST", "/admin/seed-exercises")
    if response and response.status_code == 200:
        result = response.json()
        log_test("Seed Exercises", True, result.get("message", ""))
        return True
    else:
        log_test("Seed Exercises", False, f"Status: {response.status_code if response else 'No response'}")
        return False

def test_user_registration():
    """Test user registration"""
    print("\n=== USER REGISTRATION ===")
    global auth_token, user_id
    
    response = make_request("POST", "/auth/register", TEST_USER)
    
    if response and response.status_code == 200:
        data = response.json()
        auth_token = data.get("access_token")
        user_data = data.get("user", {})
        user_id = user_data.get("id")
        
        if auth_token and user_id:
            log_test("User Registration", True, f"User created: {user_data.get('username')} (ID: {user_id})")
            return True
        else:
            log_test("User Registration", False, "Missing token or user ID in response")
            return False
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        log_test("User Registration", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}")
        return False

def test_user_login():
    """Test user login"""
    print("\n=== USER LOGIN ===")
    global auth_token, user_id
    
    response = make_request("POST", "/auth/login", TEST_LOGIN)
    
    if response and response.status_code == 200:
        data = response.json()
        auth_token = data.get("access_token")
        user_data = data.get("user", {})
        user_id = user_data.get("id")
        
        if auth_token and user_id:
            log_test("User Login", True, f"Login successful for: {user_data.get('username')}")
            return True
        else:
            log_test("User Login", False, "Missing token or user ID in response")
            return False
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        log_test("User Login", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}")
        return False

def test_get_current_user():
    """Test get current user endpoint"""
    print("\n=== GET CURRENT USER ===")
    
    response = make_request("GET", "/auth/me", auth=True)
    
    if response and response.status_code == 200:
        user_data = response.json()
        expected_email = TEST_USER["email"]
        actual_email = user_data.get("email")
        
        if actual_email == expected_email:
            log_test("Get Current User", True, f"User profile retrieved: {user_data.get('username')}")
            return True
        else:
            log_test("Get Current User", False, f"Email mismatch: expected {expected_email}, got {actual_email}")
            return False
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        log_test("Get Current User", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}")
        return False

def test_exercise_library():
    """Test exercise library endpoints"""
    print("\n=== EXERCISE LIBRARY ===")
    global exercise_ids
    
    # Test get all exercises
    response = make_request("GET", "/exercises")
    if response and response.status_code == 200:
        exercises = response.json()
        if len(exercises) > 0:
            exercise_ids = [ex["id"] for ex in exercises[:5]]  # Store first 5 for later use
            log_test("Get All Exercises", True, f"Retrieved {len(exercises)} exercises")
        else:
            log_test("Get All Exercises", False, "No exercises returned")
            return False
    else:
        log_test("Get All Exercises", False, f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test filter by muscle
    response = make_request("GET", "/exercises?muscle=Espalda")
    if response and response.status_code == 200:
        back_exercises = response.json()
        log_test("Filter by Muscle (Espalda)", True, f"Found {len(back_exercises)} back exercises")
    else:
        log_test("Filter by Muscle (Espalda)", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Test search exercises
    response = make_request("GET", "/exercises?search=pull")
    if response and response.status_code == 200:
        search_results = response.json()
        log_test("Search Exercises (pull)", True, f"Found {len(search_results)} exercises matching 'pull'")
    else:
        log_test("Search Exercises (pull)", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Test get muscle groups
    response = make_request("GET", "/exercises/muscles")
    if response and response.status_code == 200:
        muscles = response.json()
        log_test("Get Muscle Groups", True, f"Retrieved {len(muscles)} muscle groups: {', '.join(muscles[:3])}...")
    else:
        log_test("Get Muscle Groups", False, f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_routine_crud():
    """Test routine CRUD operations"""
    print("\n=== ROUTINE CRUD ===")
    global routine_id
    
    if not exercise_ids:
        log_test("Create Routine", False, "No exercise IDs available")
        return False
    
    # Create routine
    routine_data = {
        "name": "Upper Body Power",
        "description": "Strength focused upper body workout",
        "routine_type": "UPPER_BODY",
        "difficulty_level": "Intermediate",
        "exercises": [
            {
                "exercise_id": exercise_ids[0],
                "exercise_order": 1,
                "sets_planned": 4,
                "reps_planned": 6,
                "target_weight_kg": 80.0,
                "rest_seconds": 180
            },
            {
                "exercise_id": exercise_ids[1],
                "exercise_order": 2,
                "sets_planned": 3,
                "reps_planned": 8,
                "target_weight_kg": 60.0,
                "rest_seconds": 120
            }
        ]
    }
    
    response = make_request("POST", "/routines", routine_data, auth=True)
    if response and response.status_code == 200:
        routine = response.json()
        routine_id = routine.get("id")
        log_test("Create Routine", True, f"Created routine: {routine.get('name')} (ID: {routine_id})")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        log_test("Create Routine", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}")
        return False
    
    # Get user routines
    response = make_request("GET", "/routines", auth=True)
    if response and response.status_code == 200:
        routines = response.json()
        log_test("Get User Routines", True, f"Retrieved {len(routines)} routines")
    else:
        log_test("Get User Routines", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Add exercise to routine
    if routine_id and len(exercise_ids) > 2:
        exercise_data = {
            "exercise_id": exercise_ids[2],
            "exercise_order": 3,
            "sets_planned": 3,
            "reps_planned": 10,
            "target_weight_kg": 40.0,
            "rest_seconds": 90
        }
        
        response = make_request("POST", f"/routines/{routine_id}/exercises", exercise_data, auth=True)
        if response and response.status_code == 200:
            log_test("Add Exercise to Routine", True, "Exercise added successfully")
        else:
            log_test("Add Exercise to Routine", False, f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_workout_sessions():
    """Test workout session flow"""
    print("\n=== WORKOUT SESSIONS ===")
    global session_id
    
    # Start workout session
    session_data = {
        "routine_id": routine_id,
        "notes": "Morning strength session"
    }
    
    response = make_request("POST", "/sessions", session_data, auth=True)
    if response and response.status_code == 200:
        session = response.json()
        session_id = session.get("id")
        log_test("Start Workout Session", True, f"Session started (ID: {session_id})")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "No response"
        log_test("Start Workout Session", False, f"Status: {response.status_code if response else 'No response'}, Error: {error_msg}")
        return False
    
    # Add sets to session
    if session_id and exercise_ids:
        # Add first set
        set_data = {
            "exercise_id": exercise_ids[0],
            "set_data": {
                "set_number": 1,
                "reps_completed": 6,
                "weight_kg": 80.0,
                "rpe": 8.0,
                "is_warmup": False,
                "is_failure": False,
                "notes": "Good form, felt strong"
            }
        }
        
        response = make_request("POST", f"/sessions/{session_id}/sets", set_data, auth=True)
        if response and response.status_code == 200:
            set_result = response.json()
            is_pr = set_result.get("is_pr", False)
            pr_note = " (NEW PR!)" if is_pr else ""
            log_test("Add Set to Session", True, f"Set added: {set_result.get('reps_completed')} reps @ {set_result.get('weight_kg')}kg{pr_note}")
        else:
            log_test("Add Set to Session", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Add second set
        set_data["set_data"]["set_number"] = 2
        set_data["set_data"]["reps_completed"] = 5
        set_data["set_data"]["weight_kg"] = 82.5
        
        response = make_request("POST", f"/sessions/{session_id}/sets", set_data, auth=True)
        if response and response.status_code == 200:
            log_test("Add Second Set", True, "Second set added successfully")
        else:
            log_test("Add Second Set", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Get session details
    if session_id:
        response = make_request("GET", f"/sessions/{session_id}", auth=True)
        if response and response.status_code == 200:
            session_details = response.json()
            total_sets = session_details.get("total_sets", 0)
            total_volume = session_details.get("total_volume_kg", 0)
            log_test("Get Session Details", True, f"Session has {total_sets} sets, {total_volume}kg total volume")
        else:
            log_test("Get Session Details", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Complete session
    if session_id:
        response = make_request("POST", f"/sessions/{session_id}/complete", auth=True)
        if response and response.status_code == 200:
            completed_session = response.json()
            duration = completed_session.get("duration_minutes", 0)
            log_test("Complete Session", True, f"Session completed in {duration} minutes")
        else:
            log_test("Complete Session", False, f"Status: {response.status_code if response else 'No response'}")
    
    return True

def test_progress_endpoints():
    """Test progress and stats endpoints"""
    print("\n=== PROGRESS & STATS ===")
    
    # Get dashboard stats
    response = make_request("GET", "/progress/dashboard", auth=True)
    if response and response.status_code == 200:
        stats = response.json()
        streak = stats.get("current_streak_days", 0)
        volume = stats.get("total_volume_kg", 0)
        level = stats.get("account_level", "Unknown")
        workouts = stats.get("workouts_this_month", 0)
        log_test("Get Dashboard Stats", True, f"Level: {level}, Streak: {streak} days, Volume: {volume}kg, Workouts: {workouts}")
    else:
        log_test("Get Dashboard Stats", False, f"Status: {response.status_code if response else 'No response'}")
    
    # Get personal records
    response = make_request("GET", "/progress/prs", auth=True)
    if response and response.status_code == 200:
        prs = response.json()
        log_test("Get Personal Records", True, f"Retrieved {len(prs)} personal records")
        
        # Show first few PRs if any
        for i, pr in enumerate(prs[:3]):
            print(f"   PR {i+1}: {pr.get('exercise_name')} - {pr.get('value')}kg ({pr.get('pr_type')})")
    else:
        log_test("Get Personal Records", False, f"Status: {response.status_code if response else 'No response'}")
    
    return True

def run_all_tests():
    """Run all backend API tests"""
    print("🏋️ Starting ToDoApp Plus Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    test_results = []
    
    # Health check first
    test_results.append(test_health_check())
    
    # Seed exercises
    test_results.append(test_seed_exercises())
    
    # Authentication flow
    test_results.append(test_user_registration())
    test_results.append(test_user_login())
    test_results.append(test_get_current_user())
    
    # Exercise library
    test_results.append(test_exercise_library())
    
    # Routines
    test_results.append(test_routine_crud())
    
    # Workout sessions
    test_results.append(test_workout_sessions())
    
    # Progress
    test_results.append(test_progress_endpoints())
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(test_results)
    total = len(test_results)
    
    print(f"Tests Passed: {passed}/{total}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return True
    else:
        print("⚠️  SOME TESTS FAILED")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)