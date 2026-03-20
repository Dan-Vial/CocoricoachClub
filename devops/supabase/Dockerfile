FROM fedora:43

RUN dnf -y update \
  && dnf -y install \
  git \
  openssl \
  && dnf clean all \
  && rm -rf /var/cache/dnf

WORKDIR /app
RUN git clone --filter=blob:none --no-checkout https://github.com/supabase/supabase

WORKDIR /app/supabase
RUN git sparse-checkout set --cone docker \
  && git checkout master

WORKDIR /app
RUN mkdir supabase-project \
  && cp -rf supabase/docker/* supabase-project \
  && cp supabase/docker/.env.example supabase-project/.env

WORKDIR /app/supabase-project
RUN chmod +x ./utils/generate-keys.sh \
  && sh ./utils/generate-keys.sh
