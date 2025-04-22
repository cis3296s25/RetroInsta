#!/bin/bash

# === Configuration ===
AWS_REGION="us-east-2"
# NOTE: Relative path logic removed as we assume we ARE in the service dir
ECR_REPOSITORY_NAME="retroinsta/back-end" # Make sure this matches ECR

# === Script Logic ===
set -e # Exit immediately if a command exits with a non-zero status.

# 1. Dynamically Get AWS Account ID from current CLI identity
echo "==> Determining AWS Account ID from STS..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [[ -z "${AWS_ACCOUNT_ID}" ]]; then
  echo "ERROR: Failed to determine AWS Account ID. Is AWS CLI configured?" >&2
  exit 1
fi
echo "  Account ID: ${AWS_ACCOUNT_ID}"

# 2. Define Full ECR Repo URI
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"

# 3. Generate a Unique Tag
TIMESTAMP=$(date +%Y%m%d%H%M%S)
# Get Git Hash relative to the repo root, assuming .git is in parent dir
GIT_HASH=$(git --git-dir=../.git rev-parse --short HEAD)
UNIQUE_TAG="${TIMESTAMP}-${GIT_HASH}"

# 4. Authenticate Docker with ECR
echo "==> Authenticating Docker with ECR in ${AWS_REGION}"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 5. Build the image using Legacy Builder
echo "==> Building image ..."
docker build \
  --no-cache \
  -t "${ECR_URI}:${UNIQUE_TAG}" \
  -t "${ECR_URI}:latest" \
  . # Build context is current directory (.) which IS the back-end directory
echo "==> Build complete."

# 6. Push the Unique Tag
echo "==> Pushing tag: ${UNIQUE_TAG}"
docker push "${ECR_URI}:${UNIQUE_TAG}"

# 7. Push the 'latest' Tag (Optional)
echo "==> Attempting to push tag: latest"
docker push "${ECR_URI}:latest" || echo "WARN: Pushing 'latest' tag failed. Might be expected due to immutability."

# 8. Output Confirmation
echo "==> Successfully built and pushed:"
echo "    Image: ${ECR_URI}"
echo "    Tags:  ${UNIQUE_TAG}, latest (attempted)"
echo "==> DONE"