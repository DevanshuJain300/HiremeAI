import json
import os
from pathlib import Path
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field
from pypdf import PdfReader


# --------------------------------------------------
# ENVIRONMENT
# --------------------------------------------------

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

model = "openai/gpt-oss-120b"

app = FastAPI()


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later replace * with your Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# RESUME MODELS
# --------------------------------------------------

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


# --------------------------------------------------
# CHAT MODELS
# --------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = Field(default_factory=list)
    mode: str = "HR Interview"


# --------------------------------------------------
# INTERVIEW QUESTION MODEL
# --------------------------------------------------

class QuestionRequest(BaseModel):
    mode: str = "HR Interview"


# --------------------------------------------------
# AI CANDIDATE CHAT
# --------------------------------------------------

def ask_candidate(
    question: str,
    resume: Resume,
    history: list[ChatMessage],
    mode: str
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
- achievements

Do not add information that is not present in the resume.
"""
    }

    selected_mode_instruction = mode_instructions.get(
        mode,
        mode_instructions["HR Interview"]
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

10. Use the previous conversation to understand references
    such as:
    - "there"
    - "that project"
    - "this technology"
    - "it"

11. Do not mention that you are an AI unless the user
    specifically asks.
    """

    # Build conversation messages

    messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]

    # Add previous conversation

    for message in history:

        messages.append(
            {
                "role": message.role,
                "content": message.content
            }
        )

    # Add current question

    messages.append(
        {
            "role": "user",
            "content": question
        }
    )

    # Call Groq

    response = client.chat.completions.create(
        model=model,
        messages=messages
    )

    return response.choices[0].message.content


# --------------------------------------------------
# GENERATE INTERVIEW QUESTIONS
# --------------------------------------------------

def generate_interview_questions(
    mode: str,
    resume: Resume
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
        model=model,
        messages=[
            {
                "role": "system",
                "content": prompt
            }
        ],
        response_format={
            "type": "json_object"
        }
    )

    raw_output = response.choices[0].message.content

    data = json.loads(raw_output)

    return data.get("questions", [])


# --------------------------------------------------
# RESUME PARSER
# --------------------------------------------------

def parse_resume(resume_text):

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

{resume_schema}

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

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": user_prompt
        }
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={
            "type": "json_object"
        }
    )

    raw_output = response.choices[0].message.content

    data = json.loads(raw_output)

    resume = Resume(**data)

    return resume


# --------------------------------------------------
# PDF EXTRACTION
# --------------------------------------------------

def read_pdf(file_path: Path):

    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text





# --------------------------------------------------
# GLOBAL RESUME
# --------------------------------------------------

# Store resumes separately for each HR session
sessions = {}


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):

    global resume

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF resumes are supported."
        )

    contents = await file.read()

    temp_path = Path("uploaded_resume.pdf")
    temp_path.write_bytes(contents)

    try:
        resume_text = read_pdf(temp_path)

        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the PDF."
            )

        parsed_resume = parse_resume(resume_text)

        # Create a unique session for this HR
        session_id = str(uuid.uuid4())

        sessions[session_id] = parsed_resume

        return {
            "message": "Resume uploaded successfully",
            "session_id": session_id,
            "candidate": parsed_resume.model_dump()
        }

    finally:

        if temp_path.exists():
            temp_path.unlink()


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "message": "Ye home page hai"
    }


# --------------------------------------------------
# GET CANDIDATE
# --------------------------------------------------

@app.get("/candidate")
def get_candidate(session_id: str):

    if session_id not in sessions:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a resume."
        )

    return sessions[session_id].model_dump()


# --------------------------------------------------
# CHAT
# --------------------------------------------------

@app.post("/chat")
def chat(request: ChatRequest, session_id: str):

    if session_id not in sessions:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a resume."
        )

    candidate_resume = sessions[session_id]

    answer = ask_candidate(
        request.question,
        candidate_resume,
        request.history,
        request.mode
    )

    return {
        "answer": answer
    }


# --------------------------------------------------
# INTERVIEW QUESTIONS
# --------------------------------------------------

@app.post("/interview-questions")
def interview_questions(
    request: QuestionRequest,
    session_id: str
):

    if session_id not in sessions:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload a resume."
        )

    candidate_resume = sessions[session_id]

    questions = generate_interview_questions(
        request.mode,
        candidate_resume
    )

    return {
        "questions": questions
    }