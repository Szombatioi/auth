`$ docker run --name <DB_NAME> -e POSTGRES_USER=<DB_USERNAME> -e POSTGRES_PASSWORD=<DB_PASSWORD> -e POSTGRES_DB=<DB_DATABASE> -p 5432:5432 -d postgres`

Example:
`$ docker run --name dev-auth -e POSTGRES_USER=auth_admin -e POSTGRES_PASSWORD=auth_admin -e POSTGRES_DB=auth_db -p 5432:5432 -d postgres`