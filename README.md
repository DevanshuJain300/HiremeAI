# HireMe AI 🤖

**AI-Powered Resume-Based Interview Assistant**

HireMe AI is an AI interview assistant that answers recruiter/interviewer questions using information extracted from a candidate's resume.

It helps recruiters and interviewers quickly explore a candidate's **experience, skills, education, projects, and background** through an interactive AI chat interface.

## 🚀 Live Demo

**Frontend:**
https://hiremeai-frontend-655d.onrender.com

**Backend API:**
https://hiremeai-backend-mm0t.onrender.com

**API Documentation:**
https://hiremeai-backend-mm0t.onrender.com/docs

## ✨ Features

* 📄 Resume-based candidate information
* 🤖 AI-powered interview assistant
* 💬 Interactive interview chat
* 🎯 Resume-grounded responses
* 🧑‍💼 HR Interview mode
* 💻 Technical Interview mode
* 🛠️ Project Interview mode
* 📋 Resume Interview mode
* ❓ AI-generated suggested interview questions
* 🔐 Groq API integration
* ⚡ FastAPI backend
* ⚛️ React frontend
* 🌐 Deployed frontend and backend

## 🧠 How It Works

```text
Candidate Resume
       ↓
   PDF Extraction
       ↓
   Resume Parsing
       ↓
 Structured Resume Data
       ↓
   Groq LLM
       ↓
 Interview Assistant
       ↓
 Recruiter / Interviewer
```

The backend extracts text from the candidate's resume, converts it into structured information, and uses that information as context for AI-generated interview responses.

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* JavaScript

### Backend

* Python
* FastAPI
* Pydantic
* PyPDF
* Groq API

### AI

* Groq
* `openai/gpt-oss-120b`

### Deployment

* Render

## 📁 Project Structure

```text
hiremeai/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── InternshipExpResume.pdf
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── .gitignore
```

## ⚙️ Run Locally

### Backend

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
```

Start the backend:

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## 🔒 Security

API keys are stored using environment variables and are not included in the source code.

Do not commit `.env` files or API keys to GitHub.

## 🎯 Project Goal

The goal of HireMe AI is to demonstrate how **LLMs, resume parsing, structured data, FastAPI, and React** can be combined to create a practical AI-powered recruitment application.

## 👨‍💻 Author

**Devanshu Jain**

B.Tech — Information Technology
AKTU Lucknow

GitHub:
https://github.com/DevanshuJain300

LinkedIn:
https://www.linkedin.com/in/devanshu-jain-a2664326b/
