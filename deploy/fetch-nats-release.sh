#!/bin/sh
set -eu
case "${TARGETARCH}:${TARGETVARIANT:-}" in
  amd64:*) arch=amd64; sha=bf5edc7b1ce98e885c368cb43a886eb148dc5d0551d99f3cf6141fb5e1954c70 ;;
  arm64:*) arch=arm64; sha=e2fbab4cad7d3c76e3052eb959570393c9d73ba756b70bf8e9eea61e9ae6d49c ;;
  arm:v6) arch=arm6; sha=a8c76cf2e716745ea140636c02f89195fb209ccbd01be46d3d973acee7d8d2e7 ;;
  arm:v7) arch=arm7; sha=ddac3887f9b0e17d657d1124bfd648d2f3d98b8b12a0918a0443eff079d2c238 ;;
  386:*) arch=386; sha=9fde80807787a77e25d0143b0835b8a7de8b735e9ebe01fcbcf0205e00f7f06b ;;
  ppc64le:*) arch=ppc64le; sha=4918414d24b16c30e71352e362b2d89e9e47c557514cefb5d4c6f2523cfee73d ;;
  s390x:*) arch=s390x; sha=478644ef83c46f585f9714b05201b5596e718cdd55ef295fb31abef6a71b4646 ;;
  riscv64:*) arch=riscv64; sha=0c7f51bdf9712e2c69336722fca636a3b038181ff843390c00a4e287ad462086 ;;
  loong64:*) arch=loong64; sha=c0875670e7a5fda318e4114cd549b39c77f3294ebb32f90f78c6e7c83635d8d9 ;;
  *) echo 'Unsupported release architecture' >&2; exit 1 ;;
esac
archive="nats-server-v2.15.1-linux-$arch"
wget -q -T 60 -O /tmp/nats.tgz "https://github.com/nats-io/nats-server/releases/download/v2.15.1/$archive.tar.gz"
printf '%s  %s\n' "$sha" /tmp/nats.tgz | sha256sum -c -
mkdir -p /out
tar -xzf /tmp/nats.tgz -C /out --strip-components=1 "$archive/nats-server" "$archive/LICENSE"
chmod 0555 /out/nats-server
chmod 0444 /out/LICENSE
rm /tmp/nats.tgz
