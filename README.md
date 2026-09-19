# Real-Time Chat Application

A full-stack WhatsApp-style chat application built with React, Node.js, Express, MongoDB, Socket.IO, and Redux.

## Features

- User registration and login with JWT cookies
- Persistent conversations and messages in MongoDB
- Two-way real-time messaging with Socket.IO
- Online/offline presence and typing indicators
- Delivered/read message status
- Unread message counts
- User search
- Profile avatars and profile photo uploads
- Edit and delete sent messages
- Responsive WhatsApp-style chat interface
- Persistent browser session and selected conversation

## Tech Stack

- Frontend: React, Redux Toolkit, React Router, Tailwind CSS, DaisyUI
- Backend: Node.js, Express, Socket.IO
- Database: MongoDB with Mongoose
- Authentication: JWT and HTTP-only cookies
- Uploads: Multer

## Project Structure

```text
backend/    Express API, Socket.IO server, MongoDB models and routes
frontend/   React application and user interface
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB or a MongoDB Atlas connection

## Environment Setup

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_secret_key
```

Keep `.env` private and never commit real credentials to GitHub.

## Run As One Application

The backend serves the compiled React frontend, REST API, uploads, and Socket.IO from one port.

From the project root:

```powershell
cd frontend
npm install
npm run build
cd ..\backend
npm install
npm start
```

Open:

```text
http://localhost:5000
```

## Development Mode

For frontend hot reload, use two terminals.

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm start
```

Development frontend: `http://localhost:3000`  
Development backend and Socket.IO: `http://localhost:5000`

## Build Verification

```powershell
cd frontend
npm run build
```

## Notes

Messages are persisted on the server in MongoDB. Redux state keeps the active session, selected conversation, and unread state available across browser refreshes, while the server remains the source of truth for chat history.
