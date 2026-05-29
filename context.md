# CrowdSource FAQ — Project Context

## What This App Is

A MERN-stack Q&A platform for **VINS (Vicharanashala Internship)** — a free, online, open-source internship run by the **Vicharanashala Lab for Education Design at IIT Ropar**. Students can:

- View FAQs (curated Q&As about the internship)
- Post questions that aren't covered in FAQs
- Get **smart duplicate detection** — similar existing FAQs/questions are shown before posting
- Upvote/downvote questions and replies
- Reply to questions, mark replies as solutions
- Admins review high-upvote questions and promote them to the FAQ

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React + React Router + Axios        |
| Backend    | Express.js                          |
| Database   | MongoDB + Mongoose                  |
| Auth       | JWT (7-day expiry) + bcryptjs       |
| Similarity | `natural` NLP library (custom algorithm) |
| NLP Algo   | Tokenization, stemming, Dice/Cosine/LCS scoring |

---

## Directory Structure

```
Crowdsourced/
├── config/
│   └── allowedEmails.js       # Whitelist of emails allowed to register
├── frontend/
│   └── src/
│       ├── App.js             # Router + route guards
│       ├── App.css
│       ├── index.js
│       ├── components/
│       │   └── Navbar.js      # Role-aware nav (Admin badge, logout)
│       └── pages/
│           ├── Login.js       # Email + password login
│           ├── Signup.js      # Whitelist-gated registration
│           ├── FAQ.js         # Browse/search FAQs (sections + text search)
│           ├── Questions.js   # Post questions + reply/upvote/downvote
│           └── AdminDashboard.js  # Approve/reject pending questions → FAQ
├── middleware/
│   └── auth.js                # JWT verification middleware
├── models/
│   ├── User.js                # name, email, password, role (student|admin)
│   ├── FAQ.js                 # question, answer, section, createdBy
│   └── Question.js            # question, replies, upvotes/downvotes, status, similarity
├── routes/
│   ├── auth.js                # POST /signup, POST /login, GET /me
│   ├── faq.js                 # CRUD / GET /sections
│   └── questions.js           # POST/GET questions, upvote/downvote/reply/solution/approve
├── utils/
│   └── duplicateDetection.js  # Smart NLP similarity engine
├── seedFaqs.js                # Seeds ~60 FAQs across ~9 sections
├── server.js                  # Express app entry point
├── package.json
└── .env                       # MONGO_URI, JWT_SECRET, PORT

frontend/         (React app — likely served via proxy or built+copied)
```

---

## Data Models

### User
- `name`, `email` (unique, lowercase), `password` (hashed), `role` (student | admin)
- Default role is `student`
- Admin accounts must be manually set in MongoDB (no admin self-signup)

### FAQ
- `question`, `answer`, `section` (required)
- `createdBy` (ref User)
- Indexed: `section`, text index on `question + answer`

### Question
- `question`, `replies[]`, `upvotes[]`, `downvotes[]` (all ref User)
- `upvoteCount`, `downvoteCount` (denormalized for sort performance)
- `similarity` (0–1 score), `similarityPercent` (0–100), `similarTo`, `similarToType`
- `status` (pending | approved | rejected)
- `createdBy` (ref User)
- Text index on `question`

### Reply (sub-document in Question)
- `text`, `createdBy`, `upvotes[]`, `downvotes[]`, `upvoteCount`, `downvoteCount`
- `isSolution` boolean — only one reply can be marked solution per question
- `markedSolutionBy` (ref User) — tracks who marked it as solution (populated as `name email role`)
- **Mark Solution:** asker OR admin can mark any reply as solution
- **Unmark Solution:** admin only

---

## Key Features

### 1. Email Whitelist Signup
- Registration is restricted to pre-approved emails in `config/allowedEmails.js`
- Currently approved: `24f3001090@ds.study.iitm.ac.in`, `bipintiwari486001@gmail.com`
- Anyone can log in if they already have an account

### 2. Smart Duplicate Detection (Duplicate Shield)
When a student posts a question:
1. Backend runs `compareQuestions()` against all existing FAQs and Questions
2. **≥85% confidence** → blocked (HTTP 409) — duplicate detected
3. **≥45% confidence** → warning shown, student must click "Post Anyway" to confirm
4. **<45%** → posted directly

The similarity algorithm uses 6 scoring methods weighted together:
- Dice coefficient on stemmed tokens (28%)
- Overlap score (18%)
- Character n-gram cosine (18%)
- Token map cosine (16%)
- Soft token matching via Jaro-Winkler (12%)
- LCS ratio (8%)

Plus intent detection, entity matching, and phrase normalization.

### 3. FAQ Sections
- FAQs are grouped by section (e.g., "About the internship", "Timing and dates", "NOC")
- Section filter buttons + full-text search (`$text` index)
- Searching clears the section filter and vice versa

### 4. Questions Workflow
- Students post → question appears in `/questions` feed (sorted by upvoteCount desc)
- Upvote threshold: **3 upvotes** → question auto-escalates from `pending` → `approved`
- Students can reply, upvote/downvote replies
- Asker or admin can mark a reply as "Solution"

### 5. Admin Dashboard
- Two tabs: **Pending Questions** and **Approved FAQs**
- Admin provides an answer and clicks "Approve & Add to FAQ" → creates FAQ entry
- Admin can also reject (delete) questions
- Admin can delete any FAQ

### 6. Role-Based Access
| Route         | Access                     |
|---------------|----------------------------|
| /login, /signup | Public                   |
| /faqs         | Authenticated (any role)   |
| /questions    | Authenticated (any role)   |
| /admin        | Authenticated + admin role |
| API /admin/*  | Admin only (middleware)    |

---

## API Endpoints

### Auth
| Method | Endpoint          | Auth | Description                  |
|--------|-------------------|------|------------------------------|
| POST   | /api/auth/signup  | No   | Register (email must be whitelisted) |
| POST   | /api/auth/login   | No   | Login, returns JWT + user    |
| GET    | /api/auth/me      | Yes  | Get current user profile     |

### FAQs
| Method | Endpoint              | Auth | Description            |
|--------|-----------------------|------|------------------------|
| GET    | /api/faqs             | No   | List FAQs (filter by section/search) |
| GET    | /api/faqs/sections    | No   | List distinct sections |
| GET    | /api/faqs/:id         | No   | Get single FAQ         |
| POST   | /api/faqs             | Yes  | Create FAQ (admin)     |
| PUT    | /api/faqs/:id         | Yes  | Update FAQ (admin)     |
| DELETE | /api/faqs/:id         | Yes  | Delete FAQ (admin)     |

### Questions
| Method | Endpoint                              | Auth | Description                    |
|--------|---------------------------------------|------|--------------------------------|
| GET    | /api/questions                        | No   | List all approved questions    |
| POST   | /api/questions                        | Yes  | Post question (duplicate check)|
| GET    | /api/questions/pending                | Yes  | Admin: list pending questions  |
| POST   | /api/questions/:id/upvote             | Yes  | Upvote a question              |
| POST   | /api/questions/:id/downvote           | Yes  | Downvote a question            |
| POST   | /api/questions/:id/reply              | Yes  | Add reply to question          |
| POST   | /api/questions/:id/replies/:rid/upvote| Yes  | Upvote a reply                 |
| POST   | /api/questions/:id/replies/:rid/downvote | Yes | Downvote a reply             |
| POST   | /api/questions/:id/replies/:rid/solution | Yes | Mark/unmark solution         |
| POST   | /api/questions/:id/approve            | Yes  | Admin: promote question to FAQ |
| DELETE | /api/questions/:id                    | Yes  | Admin: delete question         |
| POST   | /api/questions/check-similarity       | Yes  | Check similarity of a question |

---

## FAQ Sections (from seed data)

1. About the internship
2. Timing and dates
3. NOC (No Objection Certificate)
4. Selection, offer letter, and certificate
5. Work, mentorship, and projects
6. Code of conduct — communication channels
7. Interviews Related
8. Certificate
9. Rosetta — your internship journal

---

## Environment Variables (.env)

```
MONGO_URI=          # MongoDB connection string
JWT_SECRET=         # Secret for JWT signing
PORT=5000           # Server port
```

---

## Current Status

### ✅ Completed
- Login + Signup with email whitelist
- FAQ browsing (sections + search)
- Student Dashboard (`/questions`) — post questions, duplicate detection UI, upvote/downvote, reply, mark solution
- Admin Dashboard — pending review, approve/reject with answer, manage FAQs

### 🔜 Yet to Implement / TODO
- NOC upload/download functionality (mentioned in FAQs but not in app)
- Rosetta journal feature (referenced but not implemented)
- Email-based official communication (Yaksha chat portal is external — samagama.in)
- Offer letter workflow (provisional offer letter UI not present)
- Internship date confirmation workflow
- Zoom ID capture
- Push to ≥3 upvotes auto-escalation is in backend but UI shows all questions, not just user's own

### ⚠️ Known Gaps
- No way to set someone as admin from the UI — must be done directly in MongoDB
- No password reset / forgot password
- No email verification
- `seedFaqs.js` is a standalone script, not integrated into the app startup

---

## Code Style Notes

- **Backend**: CommonJS (`require`), async/await, Mongoose `.populate()` chains
- **Frontend**: Functional React with hooks, inline styles in JSX (no CSS modules), Axios for API calls
- **Auth token**: stored in `localStorage` as `token`, user object as `user` (stringified JSON)
- **Voting logic**: Toggle-based (clicking same vote again removes it); removing an upvote does NOT automatically add a downvote and vice versa
- **Duplicate detection**: Happens server-side on POST; frontend shows modal with similar FAQs/questions and a "Post Anyway" button if confidence is 45–85%

---

## How to Run

```bash
# Backend
cd E:\Project_VLED\Crowdsourced
npm install
npm run dev       # uses nodemon

# Frontend (separate terminal)
cd E:\Project_VLED\Crowdsourced\frontend
npm install
npm start         # runs on port 3000 (proxies /api to :5000)
```

MongoDB must be running and `MONGO_URI` must be set in `.env`.