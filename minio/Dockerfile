FROM minio/minio:latest

ENV MINIO_DEFAULT_BUCKETS=posts

# API port
EXPOSE 9000
# console
EXPOSE 9001

# Define the entry point for the container
ENTRYPOINT ["/usr/bin/minio"]

# Set the command to start the MinIO server
CMD ["server", "/data", "--console-address", ":9001"]