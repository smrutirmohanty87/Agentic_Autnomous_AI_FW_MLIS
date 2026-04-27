#!/bin/bash

# BDX Tests Runner Script for CI/CD
# This script runs BDX test scenarios separately

set -e  # Exit on error

echo "================================================"
echo "BDX Test Suite Runner"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
TEST_TYPE=${1:-all}

# Function to run tests
run_tests() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    if npm run $test_command; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        return 1
    fi
}

# Main execution
case $TEST_TYPE in
    intro)
        echo "Running BDX INTRO scenario..."
        run_tests "BDX INTRO" "test:bdx:intro"
        ;;
    rest)
        echo "Running BDX REST scenarios (INTER, BDE, NO COMM)..."
        run_tests "BDX REST" "test:bdx:rest"
        ;;
    all)
        echo "Running all BDX scenarios..."
        INTRO_RESULT=0
        REST_RESULT=0
        
        run_tests "BDX INTRO" "test:bdx:intro" || INTRO_RESULT=$?
        run_tests "BDX REST" "test:bdx:rest" || REST_RESULT=$?
        
        echo ""
        echo "================================================"
        echo "Test Execution Summary:"
        echo "================================================"
        
        if [ $INTRO_RESULT -eq 0 ]; then
            echo -e "${GREEN}✓ BDX INTRO: PASSED${NC}"
        else
            echo -e "${RED}✗ BDX INTRO: FAILED${NC}"
        fi
        
        if [ $REST_RESULT -eq 0 ]; then
            echo -e "${GREEN}✓ BDX REST: PASSED${NC}"
        else
            echo -e "${RED}✗ BDX REST: FAILED${NC}"
        fi
        
        if [ $INTRO_RESULT -ne 0 ] || [ $REST_RESULT -ne 0 ]; then
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid test type: $TEST_TYPE${NC}"
        echo "Usage: $0 [intro|rest|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}BDX Tests Completed Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
