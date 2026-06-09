# CrowdSource FAQ — Project Context

## What This App Is

A MERN-stack Q&A and gamified community platform for **VINS (Vicharanashala Internship)**—a free, online, open-source internship run by the **Vicharanashala Lab for Education Design at IIT Ropar**. 

Students can:
- Browse and search curated FAQs.
- Post questions in the **Discussion Space**.
- Get **smart duplicate detection** (similar FAQs/questions shown before posting).
- Upvote/downvote questions and replies.
- Reply to questions and mark replies as solutions.
- Earn **Spurti Points (SP)** and progress through community roles.
- Receive notifications about solutions, FAQ promotions, and points adjustments.
- Use **Mini Yaksha** chatbot, with an auto-post fallback when questions go unanswered.

Admins can:
- Monitor visual analytics (trending questions, category distribution charts).
- Review **FAQ Requests** (questions that cross the 20-upvote threshold) and promote/publish them directly into FAQs.
- Review and action reported items in the **Reports Received** moderation queue.
- Edit or delete any question or reply directly from the feed or dashboard.
- View soft-deleted content with audit logs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Axios, Custom CSS (Aesthetic Glassmorphism & Dark Mode) |
| **Backend** | Express.js, Node.js |
| **Database** | MongoDB, Mongoose ODM |
| **Auth** | JWT (7-day expiry), bcryptjs password hashing |
| **Similarity** | `natural` NLP library (custom multi-metric scoring algorithm) |

---

## Directory Structure

```
Crowdsourced/
├── config/
│   └── allowedEmails.js       # Whitelist of emails allowed to register
├── frontend/                  # React Frontend Application
│   └── src/
│       ├── App.js             # Router, route definitions, and private guards
│       ├── components/
│       │   ├── Navbar.js      # Role-aware navigation bar
│       │   ├── Sidebar.js     # Sidebar menu with Spurti Points display
│       │   └── Leaderboard.js # Reusable leaderboard table component
│       └── pages/
│           ├── Login.js       # User login page
│           ├── Signup.js      # Whitelist-gated registration page
│           ├── FAQ.js         # Browse/search FAQs with categories and time-based greetings
│           ├── Questions.js   # Discussion Space (Q&A feed, soft-deletes, solution tags)
│           ├── AdminDashboard.js # Mod queues, reports, and visual charts
│           ├── Leaderboards.js # Student and admin leaderboard tabs
│           ├── Notifications.js # Notification center hub
│           └── EditProfile.js  # Account settings and profile editing
├── middleware/
│   └── auth.js                # JWT verification and admin role protection
├── models/
│   ├── User.js                # Student schema (points, role, credentials)
│   ├── Admin.js               # Admin schema (points, role, credentials)
│   ├── FAQ.js                 # Curated FAQ entries
│   ├── Question.js            # Questions (replies, votes, reports, deleted flags)
│   └── Notification.js        # User notifications schema
├── routes/
│   ├── auth.js                # Signup, login, profile, and leaderboard endpoints
│   ├── faq.js                 # FAQ CRUD operations & section searches
│   └── questions.js           # Feed, upvotes, replies, reports, solutions, and check-similarity
├── utils/
│   └── duplicateDetection.js  # Multi-metric NLP similarity matching engine
├── seedFaqs.js                # Seeds FAQs database
├── server.js                  # Express server entry point
├── package.json
└── .env                       # Database connection, JWT secret, and Port
```

---

## Data Models

### User / Admin
- `name`, `email` (unique, lowercase), `password` (hashed), `role` (student | admin).
- `spurtiPoints`: defaults to 10.
- Admin accounts are stored in the `Admin` collection (no admin self-signup).

### FAQ
- `question`, `answer`, `section` (required).
- `createdBy` (ref User/Admin).
- Text index on `question + answer`.

### Question
- `question`, `status` (default `'approved'`), `promotedToFAQ` (`'none'` | `'approved'`).
- `createdBy` (ref User/Admin), `createdByModel` (`User` | Admin).
- `upvotes[]`, `downvotes[]` (ref User/Admin).
- `upvoteCount`, `downvoteCount` (denormalized for query optimization).
- `isDeleted` (soft-deleted by author), `isDeletedByAdmin` (soft-deleted by admin).
- `reports[]`: array of sub-documents containing `reportedBy`, `reportedByModel`, `reason`, `createdAt`.
- `similarity` (0–1 score), `similarTo`, `similarToType`.
- Text index on `question`.

### Reply (Sub-document in Question)
- `text`, `createdBy` (ref User/Admin), `createdByModel`.
- `upvotes[]`, `downvotes[]`, `upvoteCount`, `downvoteCount`.
- `isDeleted`, `isDeletedByAdmin`.
- `isSolution` (boolean - only one reply can be marked solution per question).
- `markedSolutionBy` (ref User/Admin), `markedSolutionByModel`.
- `reports[]`: array of sub-documents containing `reportedBy`, `reportedByModel`, `reason`, `createdAt`.

---

## Key Features

### 1. Email Whitelist Signup
- Registration is restricted to pre-approved emails listed in `config/allowedEmails.js`.

### 2. Smart Duplicate Shield
- Backend runs similarity check using 6 scoring metrics (Dice, Overlap, Cosine n-grams, Cosine token map, Jaro-Winkler, LCS) before a question is posted:
  - **≥85%** → blocked as a duplicate.
  - **45% – 85%** → warning modal shown, requires "Post Anyway" confirmation.
  - **<45%** → posted directly.

### 3. Questions & Replies Workflow
- **Direct Approval**: Newly posted questions are approved automatically (default status `'approved'`) and visible in the Discussion Space.
- **Solution Marking**: Askers and Admins can mark any reply as a solution.
- **Reporting System**: Inappropriate content can be reported with reasons. Dismissals or deletions are managed in the admin dashboard.
- **Soft Deletion Flow**:
  - Students can soft-delete their own posts. Deleted questions are hidden from students; deleted replies show `"This message was deleted by author"` inline.
  - Admins see soft-deleted content with `[Deleted by Author]` or `[Deleted by Admin]` badges and strikethroughs.

### 4. Gamification (Spurti Points & Roles)
- Points default to **10 SP** for students and admins.
- **Earning Points**:
  - Question promoted to FAQ: **+5 SP** to asker.
  - Reply marked as verified solution: **+2 SP** to replier.
  - Reply unmarked as verified solution: **-2 SP** from replier.
- **Point-Based Roles**:
  - **Student**: `< 200 SP`
  - **Volunteer**: `200 – 299 SP`
  - **Sub-Coordinator**: `300 – 499 SP`
  - **Coordinator**: `≥ 500 SP`
- Badges are updated dynamically in the UI.

### 5. Double-Sided Leaderboard
- Tracks and displays community contribution rankings.
- **Student Leaderboard**: Displays ranking, masked emails, and role badges based on SP.
- **Admin Leaderboard**: Admin-only rankings tracking administrative/moderator contributions.

### 6. Admin Dashboard & Analytics
- **Manage FAQs**: Direct CRUD operations on curated FAQs.
- **FAQ Requests Queue**: Capture questions with **≥20 upvotes** for FAQ promotion.
- **Reports Received**: Column sidebar to resolve flagged questions and replies.
- **Visual Charts**: Horizontal bar charts displaying the top 5 **Trending Student Questions** and **FAQ Category Distribution**.

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/signup | No | Register whitelist-restricted user |
| POST | /api/auth/login | No | Authenticate user, return JWT and details |
| GET | /api/auth/me | Yes | Retrieve current user profile |
| PUT | /api/auth/profile | Yes | Edit profile details |
| GET | /api/auth/leaderboard/students | Yes | Retrieve student leaderboard |
| GET | /api/auth/leaderboard/admins | Yes | Retrieve admin leaderboard (Admin-only) |

### FAQs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/faqs | No | List FAQs (with category/text filter) |
| GET | /api/faqs/sections | No | Get distinct FAQ sections |
| GET | /api/faqs/:id | No | Get single FAQ entry |
| POST | /api/faqs | Yes | Create FAQ (Admin-only) |
| PUT | /api/faqs/:id | Yes | Update FAQ (Admin-only) |
| DELETE | /api/faqs/:id | Yes | Delete FAQ (Admin-only) |

### Questions & Replies
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/questions | No | List all approved questions |
| POST | /api/questions | Yes | Post a question (duplicate detection runs) |
| GET | /api/questions/faq-requests | Yes | Get questions with ≥20 upvotes (Admin-only) |
| GET | /api/questions/reported | Yes | Get reported questions/replies (Admin-only) |
| POST | /api/questions/:id/upvote | Yes | Toggle upvote on question |
| POST | /api/questions/:id/downvote | Yes | Toggle downvote on question |
| POST | /api/questions/:id/reply | Yes | Reply to a question |
| POST | /api/questions/:id/replies/:rid/upvote | Yes | Toggle upvote on reply |
| POST | /api/questions/:id/replies/:rid/downvote| Yes | Toggle downvote on reply |
| POST | /api/questions/:id/replies/:rid/solution | Yes | Toggle verified solution tag |
| POST | /api/questions/:id/report | Yes | Report a question |
| POST | /api/questions/:id/replies/:rid/report | Yes | Report a reply |
| POST | /api/questions/:id/dismiss-reports | Yes | Clear reports on question (Admin-only) |
| POST | /api/questions/:id/replies/:rid/dismiss-reports | Yes | Clear reports on reply (Admin-only) |
| POST | /api/questions/:id/approve | Yes | Promote question to FAQ (Admin-only) |
| DELETE | /api/questions/:id | Yes | Soft-delete a question |
| DELETE | /api/questions/:id/replies/:rid | Yes | Soft-delete a reply |
| PUT | /api/questions/:id | Yes | Update question text (Admin-only) |
| PUT | /api/questions/:id/replies/:rid | Yes | Update reply text (Admin-only) |
| POST | /api/questions/check-similarity | Yes | Check question text similarity against DB |