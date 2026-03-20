# Supabase self hosted

- build:

```bash
cd ./devops/supabase
docker build . -t supabase-local
```

- copy:

```bash
docker run --name supabase-local localhost/supabase-local:latest bash
docker cp supabase-local:/app/supabase-project ./supabase
```

- config socket:

`./devops/supabase/supabase/.env`

```txt
# Docker/Podman socket location - this value will differ depending on your OS
DOCKER_SOCKET_LOCATION=
```
