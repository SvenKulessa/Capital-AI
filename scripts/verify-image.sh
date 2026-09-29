#!/bin/sh
set -eu
# Run outside the runtime image after building the exact Docker artifact.
: "${IMAGE:?Set IMAGE to the locally built image}"
image_id=$(docker image inspect --format '{{.Id}}' "$IMAGE")
mkdir -p security-reports
printf '%s\n' "$image_id" > security-reports/image-id.txt
trivy image --format cyclonedx --output security-reports/capital-ai.sbom.cdx.json "$image_id"
trivy image --ignorefile /dev/null --scanners vuln,secret --format json --output security-reports/image.json --severity HIGH,CRITICAL --exit-code 1 "$image_id"
