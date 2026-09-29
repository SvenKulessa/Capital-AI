#!/bin/sh
set -eu
# Run outside the runtime image after building the exact Docker artifact.
: "${IMAGE:?Set IMAGE to the local image digest or immutable tag}"
docker image inspect "$IMAGE" >/dev/null
trivy image --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "$IMAGE"
trivy image --format cyclonedx --output capital-ai.sbom.cdx.json "$IMAGE"
