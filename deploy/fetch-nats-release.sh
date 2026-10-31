#!/bin/sh
set -eu
case "${TARGETARCH}:${TARGETVARIANT:-}" in
  amd64:*) arch=amd64; sha=67cb8e10bc6f0c4b47f75a728529a20953dbae2a4f9a4a52ae8517d65ae303ff ;;
  arm64:*) arch=arm64; sha=bc2c788dcbf2849af749564e06a0d48c19bced851f2d68a2e21c54d078949b28 ;;
  arm:v6) arch=arm6; sha=ab5a524736eea6a1b03eb6311a176cd3341026210d565328d0479d7ee88cfc68 ;;
  arm:v7) arch=arm7; sha=1eef4d7dd7f672684f912863c4a86b1a4c52ed8e0ead15ad1f15d054ef2f75d1 ;;
  386:*) arch=386; sha=698dd31da3bcfc24a8021a8791787043425dd82bf83c8b78263d134af7bea388 ;;
  ppc64le:*) arch=ppc64le; sha=07ca1c55bf5e0ce8ff8d80088779e9049b99a2dfb2dfe0dd4415f34d387a9973 ;;
  s390x:*) arch=s390x; sha=c39a78284a5c897ffc5a833e335a67684b292ae9103e910d9f60ca5674856fd1 ;;
  riscv64:*) arch=riscv64; sha=a26bd77fe087d31d45557c8767d50c194f7d7039ffe699ea0195e06cc3958ee1 ;;
  loong64:*) arch=loong64; sha=5937eb155013393e29426fe226bdbaf53a8fe6d1ac02219cd845f0f1dc47a064 ;;
  *) echo 'Unsupported release architecture' >&2; exit 1 ;;
esac
archive="nats-server-v2.15.2-linux-$arch"
wget -q -T 60 -O /tmp/nats.tgz "https://github.com/nats-io/nats-server/releases/download/v2.15.2/$archive.tar.gz"
printf '%s  %s\n' "$sha" /tmp/nats.tgz | sha256sum -c -
mkdir -p /out
tar -xzf /tmp/nats.tgz -C /out --strip-components=1 "$archive/nats-server" "$archive/LICENSE"
chmod 0555 /out/nats-server
chmod 0444 /out/LICENSE
rm /tmp/nats.tgz
