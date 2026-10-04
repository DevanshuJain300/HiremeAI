import json
import os
import tempfile
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field
from pypdf import PdfReader


# ==================================================
# ENVIRONMENT
# ==================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Add it to your .env file."
    )

client = Groq(api_key=GROQ_API_KEY)

MODEL = "openai/gpt-oss-120b"


# ==================================================
# FASTAPI APP
# ==================================================

app = FastAPI(
    title="HireMe AI",
    description="AI Candidate Interview Assistant",
    version="1.0.0",
)


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# RESUME MODELS
# ==================================================

class Experience(BaseModel):
    company: str | None = None
    role: str | None = None
    duration: str | None = None
    description: str | None = None
    skills_used: list[str] = Field(default_factory=list)


class Resume(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None

    total_experience_years: float | None = None

    skills: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


resume_schema = Resume.model_json_schema()


# ==================================================
# CHAT MODELS
# ==================================================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = Field(default_factory=list)
    mode: str = "HR Interview"


# ==================================================
# INTERVIEW QUESTION MODEL
# ==================================================

class QuestionRequest(BaseModel):
    mode: str = "HR Interview"


# ==================================================
# SESSION STORAGE
# ==================================================

# Stores:
# session_id -> parsed Resume

sessions: dict[str, Resume] = {}


# ==================================================
# AI CANDIDATE CHAT
# ==================================================

def ask_candidate(
    question: str,
    resume: Resume,
    history: list[ChatMessage],
    mode: str,
):

    mode_instructions = {

        "HR Interview": """
Focus on behavioral and HR questions.

Answer naturally and professionally.

Emphasize:
- communication
- teamwork
- leadership
- motivation
- career goals
""",

        "Technical Interview": """
Focus on technical knowledge and programming concepts.

Give precise answers related to the candidate's actual
skills and experience.

For technical questions:
- explain concepts clearly
- use examples from the resume when available
- do not invent technical experience
""",

        "Project Interview": """
Focus on the candidate's projects.

Explain the project's:
- purpose
- technologies
- implementation
- challenges
- contribution

Only mention information that is actually available
in the resume.
""",

        "Resume Interview": """
Focus strictly on the candidate's resume.

Questions should be answered using:
- education
- experience
- skills
- projects
- certifications

Do not add information that is not present in the resume.
"""
    }

    selected_mode_instruction = mode_instructions.get(
        mode,
        mode_instructions["HR Interview"],
    )

    system_prompt = f"""
You are HireMe AI, an AI interview assistant
representing a job candidate.

INTERVIEW MODE:
{mode}

MODE INSTRUCTIONS:
{selected_mode_instruction}

You must answer questions using ONLY the candidate
information provided below.

CANDIDATE INFORMATION:

{resume.model_dump_json(indent=2)}

RULES:

1. Never invent or assume information that is not present
   in the resume.

2. If the requested information is not available, say:
   "I don't have enough information to answer that."

3. Keep answers concise and interview-friendly.

4. Usually answer in 2-5 sentences.

5. For multiple skills, technologies, or items,
   use short bullet points.

6. Do not repeat the entire resume unless specifically asked.

7. Focus only on information relevant to the question.

8. Speak naturally as if the candidate is answering
   an interviewer.

9. Be professional and confident, but do not exaggerate
   the candidate's experience.

10. Use previous conversation to understand references
    such as:
    - "there"
    - "that project"
    - "this technology"
    - "it"

11. Do not mention that you are an AI unless the user
    specifically asks.
"""

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        }
    ]

    # Add conversation history
    for message in history:

        # Only allow valid Groq chat roles
        role = message.role

        if role not in {"user", "assistant", "system"}:
            role = "user"

        messages.append(
            {
                "role": role,
                "content": message.content,
            }
        )

    # Add current question
    messages.append(
        {
            "role": "user",
            "content": question,
        }
    )

    # Call Groq
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
    )

    answer = response.choices[0].message.content

    if not answer:
        return "I don't have enough information to answer that."

    return answer


# ==================================================
# GENERATE INTERVIEW QUESTIONS
# ==================================================

def generate_interview_questions(
    mode: str,
    resume: Resume,
):

    prompt = f"""
You are an interview question generator for HireMe AI.

Generate exactly 5 interview questions for the candidate.

Interview mode:
{mode}

Candidate information:

{resume.model_dump_json(indent=2)}

RULES:

1. Questions must be relevant to the selected interview mode.

2. Questions must be based ONLY on information actually
   present in the resume.

3. Do not invent:
   - projects
   - technologies
   - companies
   - internships
   - achievements
   - experience

4. Keep questions short and natural.

5. Questions should feel like questions asked by
   a real interviewer.

6. Avoid asking the same type of question repeatedly.

7. Return ONLY a JSON object containing a "questions"
   array.

Example:

{{
    "questions": [
        "Tell me about yourself.",
        "What experience do you have with Java?",
        "How did you use Spring Boot during your internship?",
        "Tell me about a project you worked on.",
        "What are your career goals?"
    ]
}}
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": prompt,
            }
        ],
        response_format={
            "type": "json_object",
        },
    )

    raw_output = response.choices[0].message.content

    if not raw_output:
        return []

    try:
        data = json.loads(raw_output)
    except json.JSONDecodeError:
        return []

    questions = data.get("questions", [])

    if not isinstance(questions, list):
        return []

    return questions[:5]


# ==================================================
# RESUME PARSER
# ==================================================

def parse_resume(resume_text: str) -> Resume:

    system_prompt = f"""
You are an expert resume parser.

Extract information from the resume based on its meaning,
not only based on exact section headings.

Different resumes may use different headings.

For example:

- Experience
- Professional Experience
- Work History
- Employment
- Internships

These may all contain relevant experience.

Skills may also appear in:
- skills section
- work experience
- internships
- projects

Return ONLY valid JSON matching this schema:

{json.dumps(resume_schema, indent=2)}

Important rules:

1. Do not invent information.

2. If a value is not available, return null.

3. If a list has no information, return an empty list.

4. Include internships inside experiences.

5. Extract skills mentioned across the entire resume.
"""

    user_prompt = f"""
Parse the following resume:

{resume_text}
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        response_format={
            "type": "json_object",
        },
    )

    raw_output = response.choices[0].message.content

    if not raw_output:
        raise ValueError("AI returned an empty resume response.")

    try:
        data = json.loads(raw_output)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"AI returned invalid JSON: {error}"
        )

    return Resume(**data)


# ==================================================
# PDF EXTRACTION
# ==================================================

def read_pdf(file_path: Path) -> str:

    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text.strip()


# ==================================================
# HOME / HEALTH CHECK
# ==================================================

@app.get("/")
def home():

    return {
        "message": "HireMe AI backend is running",
        "status": "online",
    }


# ==================================================
# UPLOAD RESUME
# ==================================================

@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF resumes are supported.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty.",
        )

    temp_path = None

    try:

        # Create a unique temporary PDF
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf",
        ) as temp_file:

            temp_file.write(contents)
            temp_path = Path(temp_file.name)

        # Extract PDF text
        resume_text = read_pdf(temp_path)

        if not resume_text:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not extract text from the PDF. "
                    "Make sure the PDF contains selectable text."
                ),
            )

        # Parse resume with AI
        parsed_resume = parse_resume(resume_text)

        # Create unique session
        session_id = str(uuid.uuid4())

        sessions[session_id] = parsed_resume

        return {
            "message": "Resume uploaded successfully",
            "session_id": session_id,
            "candidate": parsed_resume.model_dump(),
        }

    except HTTPException:
        raise

    except Exception as error:

        print("Resume upload error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Resume processing failed: {str(error)}",
        )

    finally:

        if temp_path and temp_path.exists():
            temp_path.unlink()


# ==================================================
# GET CANDIDATE
# ==================================================

@app.get("/candidate")
def get_candidate(
    session_id: str,
):

    if session_id not in sessions:

        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a resume.",
        )

    return sessions[session_id].model_dump()


# ==================================================
# CHAT
# ==================================================

@app.post("/chat")
def chat(
    request: ChatRequest,
    session_id: str,
):

    if session_id not in sessions:

        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a resume.",
        )

    candidate_resume = sessions[session_id]

    try:

        answer = ask_candidate(
            question=request.question,
            resume=candidate_resume,
            history=request.history,
            mode=request.mode,
        )

        return {
            "answer": answer,
        }

    except Exception as error:

        print("Chat error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"AI response failed: {str(error)}",
        )


# ==================================================
# INTERVIEW QUESTIONS
# ==================================================

@app.post("/interview-questions")
def interview_questions(
    request: QuestionRequest,
    session_id: str,
):

    if session_id not in sessions:

        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a resume.",
        )

    candidate_resume = sessions[session_id]

    try:

        questions = generate_interview_questions(
            mode=request.mode,
            resume=candidate_resume,
        )

        return {
            "questions": questions,
        }

    except Exception as error:

        print("Question generation error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Question generation failed: {str(error)}",
        )