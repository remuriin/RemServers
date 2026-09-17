# Remservers

A portal that sits between users and a Pterodactyl game panel — lets users view servers and (soon) manage their own, without giving them access to the actual panel, which stays admin-only.

Live demo: (https://portal.remservers.me)

## What this is

I built this mainly to practice RESTful API integration and think through a real security problem: how do you expose part of an admin tool to regular users without just handing them admin access? Pterodactyl already has some role support built in, but I wanted to build my own layer on top of it instead of relying on that.

## What works right now

- Auth with roles (admin/user), checked on the backend, not just hidden in the UI
- Users can browse the servers available on the panel
- Admin can fully manage servers (start/stop/restart etc.) through the app
- Still building: letting a regular user manage a server they actually own, not just view it

## Stack

React frontend, express, postgresSQL, Google OAuth (login) JWT auth with RBAC, talks to Pterodactyl's API, deployed with Nginx on a VPS.

## How it's structured

The app never lets the frontend talk to Pterodactyl directly — everything goes through my own backend first, which checks the user's role before deciding what to actually forward to the panel. Right now that check is role-based (are you an admin), and the next thing I'm adding is ownership-based (is this your server), so a regular user can eventually manage their own instance without touching anyone else's.

## Status

Working and deployed, actively being built on. Screenshot below.

<img width="1919" height="1079" alt="Screenshot 2026-09-17 233319" src="https://github.com/user-attachments/assets/c29d1188-a569-4471-aba0-fcbdce398488" />
<img width="1919" height="1079" alt="Screenshot 2026-09-17 233324" src="https://github.com/user-attachments/assets/dc94b0f5-0969-439d-a8b6-4d592e8f6b3c" />
<img width="1919" height="1079" alt="Screenshot 2026-09-17 233233" src="https://github.com/user-attachments/assets/38ec46f3-ce96-4f61-8b2f-3ee8b69795c5" />
<img width="1919" height="1079" alt="Screenshot 2026-09-17 233240" src="https://github.com/user-attachments/assets/b8a3fab9-3aa6-4f67-bdfa-b3f964ee6fa5" />
<img width="1919" height="1079" alt="Screenshot 2026-09-17 233257" src="https://github.com/user-attachments/assets/60b47945-3f75-45ed-a5f3-b29164c82970" />
<img width="1919" height="1079" alt="Screenshot 2026-09-17 233310" src="https://github.com/user-attachments/assets/49cb4978-89e6-4a80-abc9-3a618ddbc154" />
