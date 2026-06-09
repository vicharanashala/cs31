# Vicharanashala Crowdsourced FAQ & Discussion Space

A modern MERN-stack Q&A, gamified community forum, and moderation platform built for **VINS (Vicharanashala Internship)**—a free, open-source online internship run by the **Vicharanashala Lab for Education Design at IIT Ropar**. 

This platform connects students and administrators, featuring a smart duplicate detection system, a real-time discussion feed, an AI chatbot integration, visual analytics, notifications, and gamified points-based progression.

---

## 🌟 Key Features

### 🧑‍🎓 Student Experience
- **Interactive FAQ Directory**: Browse and search curated FAQs grouped by sections (e.g., selection process, timelines, NOC guidelines, Rosetta journals) with full-text index searching.
- **Discussion Space**: Ask questions, add comments, reply to existing threads, and upvote/downvote content to bubble up high-quality discussions.
- **Smart Duplicate Shield**: Real-time natural language processing (NLP) analysis runs before posting to identify similar FAQs or questions, preventing redundant threads.
- **Self Soft-Deletion**: Delete your own questions or replies. Deleted replies are replaced with an inline placeholder (`"This message was deleted by author"`), while deleted questions are cleanly hidden from the feed.
- **Question & Reply Reporting**: Flag inappropriate or incorrect content with custom report reasons.
- **Solution Marking**: Askers can mark any reply as the "Verified Solution" for their question.
- **Notification Hub**: A real-time notification panel informing users when their reply is marked as a solution, when their question is promoted to FAQ, or when their Spurti Points balance changes.
- **Profile Management**: An edit-profile page to update display details and review account metrics.

### 🛡️ Admin Moderation & Operations
- **Visual Analytics Dashboard**: Displays interactive bar charts for:
  - **Most Trending Student Questions**: Ranks the top 5 community questions by upvotes with progress bars indicating relative popularity.
  - **Category Distribution**: Visualizes the distribution of FAQs across categories to monitor knowledge base coverage.
  - **Moderation Counters**: Real-time counters for pending FAQ requests and unresolved reports.
- **Report Moderation Feed**: Review flagged questions and replies in a dedicated "Reports Received" column. Dismiss reports or delete violating content directly.
- **FAQ Requests Queue**: Automatically capture questions that cross the **20 upvotes threshold** and promote them directly to the FAQ directory with custom answers and categories.
- **Direct Feed Editing & Publishing**: Edit or delete any question/reply directly from the community feed. Publish community questions directly into the FAQ directory.
- **Role-Aware Soft-Deletion View**: Admins can inspect the original text of author-deleted or admin-deleted questions/replies directly inline (formatted with a strike-through and red badge tag) for audit trails and moderation.

### 🤖 Smart Chatbot Integration (Mini Yaksha)
- **Inline Assistant**: Get instant automated replies to internship queries.
- **Auto-Post Fallback**: If Mini Yaksha is unable to answer a query, it displays an inline button prompt asking: *"Would you like to post this question to the community feed automatically?"*. Clicking it submits the question to the Discussion Space in the background without leaving the chat interface.

---

## 🏆 Gamification Engine (Spurti Points & Roles)

The platform incorporates a gamification system to drive healthy community participation, awarding users **Spurti Points (SP)** and promoting them to higher community roles.

### ⚙️ Points Mechanics
- **Default Starting Balance**: Every registered user and administrator starts with **10 SP**.
- **FAQ Promotion**: If an admin promotes a student's question to the FAQ directory, the student receives **+5 SP**.
- **Verified Solution**: If a student's reply is marked as the verified solution, they receive **+2 SP**.
- **Solution Unmarked**: If a reply is unmarked as a solution, the author loses **-2 SP** (points cannot drop below 0).

### 🏷️ Points-Based Escalation Roles
As users accumulate Spurti Points, their community badge updates automatically on all posts, replies, and leaderboard tables:
- **Student**: `< 200 SP` (Default role badge)
- **Volunteer**: `200 – 299 SP`
- **Sub-Coordinator**: `300 – 499 SP`
- **Coordinator**: `≥ 500 SP`

Administrators are given a dedicated **Admin** badge that bypasses points progression.

---

## 🥇 Double-Sided Leaderboards

The platform features a double-sided leaderboard page located at `/leaderboard` that encourages engagement:

1. **Student Leaderboard**: Displays ranking, masked emails, active role badges, and Spurti Points (SP) of all student accounts. First, second, and third-place ranks are styled with gold (🥇), silver (🥈), and bronze (🥉) medal icons.
2. **Admin Leaderboard (Admin-Only)**: A leaderboard specifically for administrators to rank admin accounts based on their contributions (answers, moderation, and FAQ publishing). Non-admin users are restricted from viewing this tab to maintain administrative privacy.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Axios, Custom CSS (Aesthetic Glassmorphism & Dark Mode) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose ODM (text search indexing, populated references) |
| **Authentication** | JSON Web Tokens (JWT, 7-day expiry), bcryptjs password hashing |
| **NLP Similarity** | `natural` NLP library (custom multi-metric scoring algorithm) |

---

## 📂 Project Directory Structure

```
Crowdsourced/
├── config/
│   └── allowedEmails.js       # Whitelist of email domains/addresses for signups
├── frontend/                  # React Frontend Application
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Navbar.js      # Role-aware nav (Admin badge, logout)
│       │   ├── Sidebar.js     # Responsive navigation sidebar
│       │   └── Leaderboard.js # Reusable leaderboard table component
│       ├── pages/
│       │   ├── Login.js       # Login page
│       │   ├── Signup.js      # Email whitelist-gated registration page
│       │   ├── FAQ.js         # FAQ search and browsing interface
│       │   ├── Questions.js   # Discussion Space (Q&A feed)
│       │   ├── AdminDashboard.js # Mod queue, reports, and FAQ management
│       │   ├── Leaderboards.js # Leaderboard index page (students + admins)
│       │   ├── Notifications.js # Notification center page
│       │   ├── EditProfile.js  # Settings & profile edit page
│       │   └── AiSupport.js   # Mini Yaksha Chatbot interface
│       ├── App.js             # Route configuration and authentication guards
│       └── index.js
├── middleware/
│   └── auth.js                # JWT token validation & role verification
├── models/
│   ├── User.js                # User accounts & roles (student, admin)
│   ├── FAQ.js                 # Curated FAQ entries
│   ├── Question.js            # Community questions, nested replies, reports, and votes
│   └── Notification.js        # User notifications schema
├── routes/
│   ├── auth.js                # Signup, login, and profile endpoints
│   ├── faq.js                 # FAQ retrieval, update, and search routes
│   └── questions.js           # Feed, upvotes, replies, reports, and solutions
├── utils/
│   └── duplicateDetection.js  # NLP-based smart similarity check engine
├── seedFaqs.js                # Database seeder (60+ FAQ items across 9 categories)
├── server.js                  # Entry point for the Express backend API
├── package.json               # Backend dependencies and scripts
└── .env                       # Environment variables (DB URI, JWT secrets, Port)
```

---

## 🧠 Smart Similarity Engine (Duplicate Shield)

To keep the FAQ database and discussion boards clean, a smart algorithm checks all incoming questions against existing FAQs and approved questions:

1. **Similarity Score < 45%**: The question is posted directly.
2. **Similarity Score 45% – 85%**: The posting is paused. The frontend displays a custom modal showing the similar matching posts and prompts the user to either read them or click **"Post Anyway"**.
3. **Similarity Score ≥ 85%**: The post is blocked as an absolute duplicate, showing a validation error.

### Scoring Metrics & Weighting
The similarity score is calculated by combining multiple NLP metrics:
- **Dice Coefficient on Stemmed Tokens (28%)**: Word overlap on base forms.
- **Overlap Score (18%)**: Counts matching key terms.
- **Character N-Gram Cosine (18%)**: Handles typos and partial spelling matches.
- **Token Map Cosine (16%)**: Analyzes semantic frequency vectors.
- **Jaro-Winkler Soft Token Matching (12%)**: Computes word-level character alignment.
- **LCS (Longest Common Subsequence) Ratio (8%)**: Retains original phrase sequence alignment.

---

## 🔐 Authentication & Whitelist Security
- **Email Whitelist**: Registration is restricted to specific users listed in [config/allowedEmails.js](file:///e:/Project_VLED/Crowdsourced/config/allowedEmails.js).
- **Admin Accounts**: Cannot be signed up publicly. Admin roles (`"admin"`) must be assigned directly inside the MongoDB database.

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- **MongoDB** (Atlas cloud cluster or local database instance)

### 1. Setup Environment Variables
Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/crowdsourced
JWT_SECRET=your_jwt_signing_secret_key
PORT=5005
```

### 2. Install Dependencies & Seed FAQs
Run these commands in the project root:

```bash
# Install backend dependencies
npm install

# Seed the FAQ directory with default internship data
node seedFaqs.js
```

### 3. Run the Backend Server
Start the API server on port `5005`:

```bash
# Start backend in development mode (with nodemon)
npm run dev
```

### 4. Run the Frontend Server
Open a new terminal session, navigate to the frontend directory, install dependencies, and start the React dev server:

```bash
# Move to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the frontend dev server (runs on port 3000, proxies /api to port 5005)
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 Production Build

To compile the React frontend for production deployment:

```bash
cd frontend
npm run build
```

This generates an optimized static build directory under `frontend/build` that can be served via static file servers or directly from the Node/Express backend.
