#!/usr/bin/env python3
"""
ToDoApp Plus Backend API Testing Suite
Tests the updated Exercise Library API and new Achievements API
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://todofit.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", expected: Any = None, actual: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if expected is not None:
            result["expected"] = expected
        if actual is not None:
            result["actual"] = actual
        
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and expected is not None and actual is not None:
            print(f"   Expected: {expected}")
            print(f"   Actual: {actual}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        # Add auth header if we have a token
        if self.auth_token and headers is None:
            headers = {}
        if self.auth_token:
            headers = headers or {}
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise

    def test_health_check(self):
        """Test basic API health"""
        try:
            response = self.make_request("GET", "/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("API Health Check", True, f"Status: {data.get('status', 'unknown')}")
            else:
                self.log_test("API Health Check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("API Health Check", False, f"Exception: {str(e)}")

    def test_user_registration(self):
        """Test user registration"""
        try:
            # Create unique user for testing
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            user_data = {
                "email": f"testuser_{timestamp}@fitness.com",
                "username": f"fituser_{timestamp}",
                "password": "SecurePass123!",
                "full_name": f"Test User {timestamp}"
            }
            
            response = self.make_request("POST", "/auth/register", user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    self.user_data = data["user"]
                    self.log_test("User Registration", True, 
                                f"User created: {data['user']['username']}, Token received")
                else:
                    self.log_test("User Registration", False, "Missing token or user data in response")
            else:
                self.log_test("User Registration", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")

    def test_user_login(self):
        """Test user login with created user"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data available for login test")
            return
            
        try:
            login_data = {
                "email": self.user_data["email"],
                "password": "SecurePass123!"
            }
            
            response = self.make_request("POST", "/auth/login", login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.log_test("User Login", True, "Login successful, token received")
                else:
                    self.log_test("User Login", False, "No token in login response")
            else:
                self.log_test("User Login", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")

    def test_get_current_user(self):
        """Test getting current user profile"""
        if not self.auth_token:
            self.log_test("Get Current User", False, "No auth token available")
            return
            
        try:
            response = self.make_request("GET", "/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "email", "username", "account_level"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Get Current User", True, 
                                f"User profile retrieved: {data['username']}")
                else:
                    self.log_test("Get Current User", False, 
                                f"Missing fields: {missing_fields}")
            else:
                self.log_test("Get Current User", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Get Current User", False, f"Exception: {str(e)}")

    def test_exercise_library_count(self):
        """Test that exercise library has 441 exercises"""
        try:
            response = self.make_request("GET", "/exercises?limit=500")
            
            if response.status_code == 200:
                exercises = response.json()
                exercise_count = len(exercises)
                
                if exercise_count == 441:
                    self.log_test("Exercise Library Count", True, 
                                f"Found exactly 441 exercises")
                else:
                    self.log_test("Exercise Library Count", False, 
                                f"Expected 441 exercises, found {exercise_count}", 
                                expected=441, actual=exercise_count)
            else:
                self.log_test("Exercise Library Count", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Exercise Library Count", False, f"Exception: {str(e)}")

    def test_muscle_groups_count(self):
        """Test that there are 11 muscle groups including 'Antebrazo'"""
        try:
            response = self.make_request("GET", "/exercises/muscles")
            
            if response.status_code == 200:
                muscles = response.json()
                muscle_count = len(muscles)
                
                # Check count
                if muscle_count == 11:
                    count_success = True
                    count_details = f"Found exactly 11 muscle groups"
                else:
                    count_success = False
                    count_details = f"Expected 11 muscle groups, found {muscle_count}"
                
                # Check for 'Antebrazo'
                has_antebrazo = "Antebrazo" in muscles
                antebrazo_details = "'Antebrazo' found in muscle groups" if has_antebrazo else "'Antebrazo' missing from muscle groups"
                
                overall_success = count_success and has_antebrazo
                details = f"{count_details}. {antebrazo_details}. Muscles: {muscles}"
                
                self.log_test("Muscle Groups Count & Antebrazo", overall_success, details,
                            expected="11 groups with 'Antebrazo'", 
                            actual=f"{muscle_count} groups, Antebrazo: {has_antebrazo}")
            else:
                self.log_test("Muscle Groups Count & Antebrazo", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Muscle Groups Count & Antebrazo", False, f"Exception: {str(e)}")

    def test_exercise_search_functionality(self):
        """Test exercise search and filter functionality"""
        try:
            # Test search by name
            response = self.make_request("GET", "/exercises?search=pull&limit=20")
            
            if response.status_code == 200:
                exercises = response.json()
                
                # Check if results contain 'pull' in name
                search_results = [ex for ex in exercises if 'pull' in ex['name'].lower()]
                
                if len(search_results) > 0:
                    self.log_test("Exercise Search by Name", True, 
                                f"Found {len(search_results)} exercises with 'pull' in name")
                else:
                    self.log_test("Exercise Search by Name", False, 
                                "No exercises found with 'pull' in name")
            else:
                self.log_test("Exercise Search by Name", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Exercise Search by Name", False, f"Exception: {str(e)}")

    def test_exercise_muscle_filter(self):
        """Test exercise filtering by muscle group"""
        try:
            # Test filter by muscle (Espalda)
            response = self.make_request("GET", "/exercises?muscle=Espalda&limit=50")
            
            if response.status_code == 200:
                exercises = response.json()
                
                # Check if all results are for 'Espalda'
                espalda_exercises = [ex for ex in exercises if ex['muscle'] == 'Espalda']
                
                if len(espalda_exercises) == len(exercises) and len(exercises) > 0:
                    self.log_test("Exercise Muscle Filter", True, 
                                f"Found {len(exercises)} exercises for 'Espalda' muscle")
                else:
                    self.log_test("Exercise Muscle Filter", False, 
                                f"Filter inconsistent: {len(espalda_exercises)}/{len(exercises)} match")
            else:
                self.log_test("Exercise Muscle Filter", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Exercise Muscle Filter", False, f"Exception: {str(e)}")

    def test_achievements_list(self):
        """Test GET /api/achievements - should return 20 achievements"""
        try:
            response = self.make_request("GET", "/achievements")
            
            if response.status_code == 200:
                achievements = response.json()
                achievement_count = len(achievements)
                
                if achievement_count == 20:
                    # Check structure of first achievement
                    if achievements:
                        first_ach = achievements[0]
                        required_fields = ["id", "code", "name", "description", "category", "points", "rarity"]
                        missing_fields = [field for field in required_fields if field not in first_ach]
                        
                        if not missing_fields:
                            self.log_test("Achievements List", True, 
                                        f"Found exactly 20 achievements with correct structure")
                        else:
                            self.log_test("Achievements List", False, 
                                        f"Achievement missing fields: {missing_fields}")
                    else:
                        self.log_test("Achievements List", False, "Empty achievements list")
                else:
                    self.log_test("Achievements List", False, 
                                f"Expected 20 achievements, found {achievement_count}",
                                expected=20, actual=achievement_count)
            else:
                self.log_test("Achievements List", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Achievements List", False, f"Exception: {str(e)}")

    def test_user_achievements(self):
        """Test GET /api/achievements/user - requires auth"""
        if not self.auth_token:
            self.log_test("User Achievements", False, "No auth token available")
            return
            
        try:
            response = self.make_request("GET", "/achievements/user")
            
            if response.status_code == 200:
                user_achievements = response.json()
                
                # For new user, should be empty or have basic achievements
                self.log_test("User Achievements", True, 
                            f"Retrieved user achievements: {len(user_achievements)} unlocked")
            else:
                self.log_test("User Achievements", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("User Achievements", False, f"Exception: {str(e)}")

    def test_check_achievements(self):
        """Test POST /api/achievements/check - requires auth"""
        if not self.auth_token:
            self.log_test("Check Achievements", False, "No auth token available")
            return
            
        try:
            response = self.make_request("POST", "/achievements/check")
            
            if response.status_code == 200:
                result = response.json()
                
                if "newly_unlocked" in result and "total_unlocked" in result:
                    self.log_test("Check Achievements", True, 
                                f"Achievement check successful. Newly unlocked: {len(result['newly_unlocked'])}, Total: {result['total_unlocked']}")
                else:
                    self.log_test("Check Achievements", False, 
                                "Missing required fields in response")
            else:
                self.log_test("Check Achievements", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Check Achievements", False, f"Exception: {str(e)}")

    def test_routines_crud_quick(self):
        """Quick test of routines CRUD operations"""
        if not self.auth_token:
            self.log_test("Routines CRUD Quick Test", False, "No auth token available")
            return
            
        try:
            # Test GET routines (should be empty for new user)
            response = self.make_request("GET", "/routines")
            
            if response.status_code == 200:
                routines = response.json()
                self.log_test("Routines CRUD Quick Test", True, 
                            f"Routines endpoint accessible, found {len(routines)} routines")
            else:
                self.log_test("Routines CRUD Quick Test", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Routines CRUD Quick Test", False, f"Exception: {str(e)}")

    def test_workout_sessions_quick(self):
        """Quick test of workout sessions endpoint"""
        if not self.auth_token:
            self.log_test("Workout Sessions Quick Test", False, "No auth token available")
            return
            
        try:
            # Test GET sessions (should be empty for new user)
            response = self.make_request("GET", "/sessions")
            
            if response.status_code == 200:
                sessions = response.json()
                self.log_test("Workout Sessions Quick Test", True, 
                            f"Sessions endpoint accessible, found {len(sessions)} sessions")
            else:
                self.log_test("Workout Sessions Quick Test", False, 
                            f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Workout Sessions Quick Test", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("ToDoApp Plus Backend API Testing Suite")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print("=" * 60)
        print()

        # Basic connectivity
        self.test_health_check()
        
        # Authentication flow
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # Exercise Library API (main focus)
        self.test_exercise_library_count()
        self.test_muscle_groups_count()
        self.test_exercise_search_functionality()
        self.test_exercise_muscle_filter()
        
        # NEW Achievements API (main focus)
        self.test_achievements_list()
        self.test_user_achievements()
        self.test_check_achievements()
        
        # Quick verification of existing APIs
        self.test_routines_crud_quick()
        self.test_workout_sessions_quick()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['details']}")
            print()
        
        print("CRITICAL FOCUS AREAS:")
        exercise_tests = [r for r in self.test_results if "Exercise" in r["test"]]
        achievement_tests = [r for r in self.test_results if "Achievement" in r["test"]]
        
        exercise_passed = len([r for r in exercise_tests if r["success"]])
        achievement_passed = len([r for r in achievement_tests if r["success"]])
        
        print(f"Exercise Library API: {exercise_passed}/{len(exercise_tests)} tests passed")
        print(f"Achievements API: {achievement_passed}/{len(achievement_tests)} tests passed")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)