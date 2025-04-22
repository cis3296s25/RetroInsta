#!/bin/bash

# === Configuration ===
AWS_REGION="us-east-2"
ECR_REPOSITORY_NAME="retroinsta/front-end" # ECR Repo name for frontend
SERVICE_DIR="front-end"                  # Directory containing the Dockerfile.prod
DOCKERFILE_NAME="Dockerfile.prod"        # Explicitly name the production Dockerfile

# === Script Logic ===
set -e # Exit immediately if a command exits with a non-zero status.

# 1. Get Required Build Arguments (Prompt user or use defaults)
#    You MUST provide these values for the build to work correctly.
read -p "Enter VITE_BACKEND_URL (App Runner backend URL): " VITE_BACKEND_URL
if [[ -z "${VITE_BACKEND_URL}" ]]; then
  echo "ERROR: VITE_BACKEND_URL build argument is required." >&2
  exit 1
fi

# 2. Dynamically Get AWS Account ID from current CLI identity
echo "==> Determining AWS Account ID from STS..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [[ -z "${AWS_ACCOUNT_ID}" ]]; then
  echo "ERROR: Failed to determine AWS Account ID. Is AWS CLI configured?" >&2
  exit 1
fi
echo "  Account ID: ${AWS_ACCOUNT_ID}"

# 3. Define Full ECR Repo URI
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"

# 4. Generate a Unique Tag (Timestamp + Short Git Hash)
TIMESTAMP=$(date +%Y%m%d%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD)
UNIQUE_TAG="${TIMESTAMP}-${GIT_HASH}"
LATEST_TAG="latest" # Define the latest tag

# 6. Authenticate Docker with ECR
echo "==> Authenticating Docker with ECR in ${AWS_REGION}"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 7. Build the frontend image using PRODUCTION Dockerfile and Build Args
#    Using regular 'docker build' for now as BuildKit had issues. Use 'docker buildx build --push' if that proved more reliable for you.
echo "==> Building frontend image using Dockerfile: ${DOCKERFILE_NAME}"
echo "    VITE_BACKEND_URL=${VITE_BACKEND_URL}"

# Consider adding DOCKER_BUILDKIT=0 if builds failed without it previously
# export DOCKER_BUILDKIT=0
docker build \
  -f "${DOCKERFILE_NAME}" \
  --platform linux/amd64 \
  --build-arg VITE_BACKEND_URL="${VITE_BACKEND_URL}" \
  -t "${ECR_URI}:${UNIQUE_TAG}" \
  -t "${ECR_URI}:${LATEST_TAG}" \
  . # Build context is current directory (SERVICE_DIR)
# unset DOCKER_BUILDKIT # If you used the export

echo "==> Build complete."

# 8. Push the Unique Tag
echo "==> Pushing tag: ${UNIQUE_TAG}"
docker push "${ECR_URI}:${UNIQUE_TAG}"

# 9. Push the 'latest' Tag (Optional)
echo "==> Attempting to push tag: ${LATEST_TAG}"
docker push "${ECR_URI}:${LATEST_TAG}" || echo "WARN: Pushing '${LATEST_TAG}' tag failed. This might be expected if tag immutability is enabled and '${LATEST_TAG}' exists."

# 10. Return to Original Directory
cd ..

# 11. Output Confirmation
echo "==> Successfully built and pushed:"
echo "    Image: ${ECR_URI}"
echo "    Tags:  ${UNIQUE_TAG}, ${LATEST_TAG} (attempted)"
echo "==> DONE"