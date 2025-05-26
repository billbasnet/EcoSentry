#!/bin/bash
# Exit on error
set -o errexit

# Install python dependencies
pip install -r requirements.txt

# Additional build steps if needed
echo "Build completed successfully"
