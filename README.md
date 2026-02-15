# Auth service

## Basic user management

* User entity: 
    * Email
    * Password
    * Username
    * First name
    * Last name
    * Profile Picture URL (not storing images!)
    * *Roles*
* UserRole entity:
    * Role (name of role)
    * Priority (integer, the higher, the more important)

## Pre-seeded values
* User and Admin roles
    * <u>User</u>: basic user, priority: 1
    * <u>Admin</u>: most important, priority: 999
* Admin user
    * User AND Admin roles

## Basic operations:
* Register a new user (POST /register)
* Login (get JWT token) (POST /login)
* Update user (PATCH, JWT guarded)
* Return me (check JWT token, /me endpoint)
* Get all users (GET)

# Start auth service:

`$ docker run --name <DB_NAME> -e POSTGRES_USER=<DB_USERNAME> -e POSTGRES_PASSWORD=<DB_PASSWORD> -e POSTGRES_DB=<DB_DATABASE> -p 5432:5432 -d postgres`

Example:
`$ docker run --name dev-auth -e POSTGRES_USER=auth_admin -e POSTGRES_PASSWORD=auth_admin -e POSTGRES_DB=auth_db -p 5432:5432 -d postgres`