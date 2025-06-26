#!/usr/bin/env python3
import requests
import json
import time
import os
import sys
from datetime import datetime

# Get the backend URL from the frontend .env file
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.strip().split('=')[1].strip('"\'')
    return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    print("Error: Could not find REACT_APP_BACKEND_URL in frontend/.env")
    sys.exit(1)

print(f"Using backend URL: {BACKEND_URL}")

# Test helper functions
def print_separator():
    print("\n" + "="*80 + "\n")

def print_test_header(test_name):
    print_separator()
    print(f"TESTING: {test_name}")
    print_separator()

def print_response(response):
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")

# Test functions
def test_submit_review():
    print_test_header("Submit Review")
    
    # Test case 1: Submit valid review with all ratings and comment
    review_data = {
        "support_rating": 4,
        "quality_rating": 5,
        "features_rating": 3,
        "value_rating": 4,
        "comment": "Très bon produit, le support est réactif et la qualité est excellente."
    }
    
    response = requests.post(f"{BACKEND_URL}/api/reviews", json=review_data)
    print("Test Case 1: Submit valid review with all ratings and comment")
    print_response(response)
    
    # Store the review ID for later tests
    review_id = None
    if response.status_code == 200:
        review_id = response.json().get("id")
        print(f"Review ID: {review_id}")
    
    # Test case 2: Submit review without comment
    review_data = {
        "support_rating": 3,
        "quality_rating": 4,
        "features_rating": 5,
        "value_rating": 2
    }
    
    response = requests.post(f"{BACKEND_URL}/api/reviews", json=review_data)
    print("\nTest Case 2: Submit review without comment")
    print_response(response)
    
    # Test case 3: Submit invalid review (missing required field)
    review_data = {
        "support_rating": 4,
        "quality_rating": 5,
        "comment": "Missing required ratings"
    }
    
    response = requests.post(f"{BACKEND_URL}/api/reviews", json=review_data)
    print("\nTest Case 3: Submit invalid review (missing required field)")
    print_response(response)
    
    return review_id

def test_get_reviews():
    print_test_header("Get Reviews")
    
    # Test case 1: Get all reviews
    response = requests.get(f"{BACKEND_URL}/api/reviews")
    print("Test Case 1: Get all reviews")
    print_response(response)
    
    # Test case 2: Get pending reviews
    response = requests.get(f"{BACKEND_URL}/api/reviews?status=pending")
    print("\nTest Case 2: Get pending reviews")
    print_response(response)
    
    # Test case 3: Get approved reviews (should be empty initially)
    response = requests.get(f"{BACKEND_URL}/api/reviews?status=approved")
    print("\nTest Case 3: Get approved reviews")
    print_response(response)
    
    # Test case 4: Get reviews with limit
    response = requests.get(f"{BACKEND_URL}/api/reviews?limit=1")
    print("\nTest Case 4: Get reviews with limit=1")
    print_response(response)

def test_update_review_status(review_id):
    print_test_header("Update Review Status")
    
    if not review_id:
        print("No review ID available for testing status update")
        return
    
    # Test case 1: Approve a review
    response = requests.put(f"{BACKEND_URL}/api/reviews/{review_id}/status?status=approved")
    print("Test Case 1: Approve a review")
    print_response(response)
    
    # Test case 2: Verify the review is now approved
    response = requests.get(f"{BACKEND_URL}/api/reviews?status=approved")
    print("\nTest Case 2: Verify the review is now approved")
    print_response(response)
    
    # Test case 3: Try to update with invalid status
    response = requests.put(f"{BACKEND_URL}/api/reviews/{review_id}/status?status=invalid")
    print("\nTest Case 3: Try to update with invalid status")
    print_response(response)
    
    # Test case 4: Try to update non-existent review
    fake_id = "nonexistent-id-12345"
    response = requests.put(f"{BACKEND_URL}/api/reviews/{fake_id}/status?status=rejected")
    print("\nTest Case 4: Try to update non-existent review")
    print_response(response)

def test_get_stats():
    print_test_header("Get Statistics")
    
    # Test case 1: Get overall statistics
    response = requests.get(f"{BACKEND_URL}/api/stats")
    print("Test Case 1: Get overall statistics")
    print_response(response)
    
    # Test case 2: Get weekly statistics
    response = requests.get(f"{BACKEND_URL}/api/stats/weekly")
    print("\nTest Case 2: Get weekly statistics")
    print_response(response)
    
    # Test case 3: Get monthly statistics
    response = requests.get(f"{BACKEND_URL}/api/stats/monthly")
    print("\nTest Case 3: Get monthly statistics")
    print_response(response)

def test_export_reviews():
    print_test_header("Export Reviews")
    
    # Test case 1: Export reviews as CSV
    response = requests.get(f"{BACKEND_URL}/api/export")
    print("Test Case 1: Export reviews as CSV")
    print_response(response)

def run_all_tests():
    print(f"Starting backend API tests at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Backend URL: {BACKEND_URL}")
    print_separator()
    
    # Run all tests in sequence
    review_id = test_submit_review()
    test_get_reviews()
    test_update_review_status(review_id)
    test_get_stats()
    test_export_reviews()
    
    print_separator()
    print("All tests completed!")

if __name__ == "__main__":
    run_all_tests()