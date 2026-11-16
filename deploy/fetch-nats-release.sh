#!/bin/sh
set -eu
case "${TARGETARCH}:${TARGETVARIANT:-}" in
  amd64:*) arch=amd64; sha=32e18c1e78d7ef4f86e483070eef3abb2647c3d4d67e29668077c7ad81da0797 ;;
  arm64:*) arch=arm64; sha=4a2088b3ec7103bf79d6484f55e80ab5d10204811d9ae6f7a33e8544d98dd45d ;;
  arm:v6) arch=arm6; sha=8e8b26d30b877ccc27ca02233503a7df610f911cae4864ca81f6dc2dbc318dd8 ;;
  arm:v7) arch=arm7; sha=a7619752fc73450e40ea4946c64f7a4d6cb8939dc5b3b55dd9c11c508b4c2851 ;;
  386:*) arch=386; sha=36612a9bb1025ffb5b2514a9e797f8bfe0948de9f6a9613805ae132992eeb52a ;;
  ppc64le:*) arch=ppc64le; sha=42177527c9c647ae79350422e62f9006942c0b09c3146940d0518e3e77b80e61 ;;
  s390x:*) arch=s390x; sha=2e4e626413ed55df226e03e60d36db706224cc871dfe45ad5d495a27570ea542 ;;
  riscv64:*) arch=riscv64; sha=da11398edb7f2986147872decf58a357b0290dd105b77642128423121c1dccf5 ;;
  loong64:*) arch=loong64; sha=dd4a33aa515a32f88488de1a78d9a4504dab86f91beac630ed1acddb58c6c554 ;;
  *) echo 'Unsupported release architecture' >&2; exit 1 ;;
esac
archive="nats-server-v2.15.3-linux-$arch"
wget -q -T 60 -O /tmp/nats.tgz "https://github.com/nats-io/nats-server/releases/download/v2.15.3/$archive.tar.gz"
printf '%s  %s\n' "$sha" /tmp/nats.tgz | sha256sum -c -
mkdir -p /out
tar -xzf /tmp/nats.tgz -C /out --strip-components=1 "$archive/nats-server" "$archive/LICENSE"
chmod 0555 /out/nats-server
chmod 0444 /out/LICENSE
rm /tmp/nats.tgz
