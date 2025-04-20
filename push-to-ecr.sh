#!/bin/bash

# === Configuration ===
# AWS_ACCOUNT_ID="850995567676" # REMOVE THIS HARDCODED LINE
AWS_REGION="us-east-2"
ECR_REPOSITORY_NAME="retroinsta/back-end"
SERVICE_DIR="back-end"

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
GIT_HASH=$(git rev-parse --short HEAD)
UNIQUE_TAG="${TIMESTAMP}-${GIT_HASH}"

# 4. Navigate to Service Directory
echo "==> Changing directory to ${SERVICE_DIR}"
cd "${SERVICE_DIR}" || exit 1

# 5. Authenticate Docker with ECR
echo "==> Authenticating Docker with ECR in ${AWS_REGION}"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 6. Build the image using Legacy Builder
echo "==> Building image with legacy builder (DOCKER_BUILDKIT=0)..."
export DOCKER_BUILDKIT=0
docker build \
  --no-cache \
  -t "${ECR_URI}:${UNIQUE_TAG}" \
  -t "${ECR_URI}:latest" \
  .
unset DOCKER_BUILDKIT
echo "==> Build complete."

# 7. Push the Unique Tag
echo "==> Pushing tag: ${UNIQUE_TAG}"
docker push "${ECR_URI}:${UNIQUE_TAG}"

# 8. Push the 'latest' Tag (Optional)
echo "==> Attempting to push tag: latest"
docker push "${ECR_URI}:latest" || echo "WARN: Pushing 'latest' tag failed. Might be expected due to immutability."

# 9. Return to Original Directory (optional)
# cd ..

# 10. Output Confirmation
echo "==> Successfully built and pushed:"
echo "    Image: ${ECR_URI}"
echo "    Tags:  ${UNIQUE_TAG}, latest (attempted)"
echo "==> DONE"