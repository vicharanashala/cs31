const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');
const FAQ = require('./models/FAQ');

const faqs = [
  { question: '1.1 What is the Vicharanashala internship?', answer: 'A two-month internship run by Vicharanashala, a research lab at IIT Ropar. You will work on a real open-source project under a mentor, after a short training phase tailored to where you already are. The internship is free — we do not charge, and the work is real.', section: 'About the internship' },
  { question: '1.2 What is VINS?', answer: 'VINS is the Vicharanashala Internship — an online programme open to anyone who clears our interview. The work is real open-source contribution under a mentor, the certificate is from the Vicharanashala Lab for Education Design at IIT Ropar, and the programme itself is free (we charge nothing). There is no stipend.', section: 'About the internship' },
  { question: '1.3 What are the phases of VINS, and what do the badges mean?', answer: 'VINS is structured as four phases. Bronze (Phase 1) — training period. Silver (Phase 2) — main work on open-source project. Gold (Phase 3) — recognition for meaningful contribution. Platinum (Phase 4) — invitation to visit the lab.', section: 'About the internship' },
  { question: '1.4 Who is the internship for? Are alumni eligible?', answer: 'The internship is for currently-enrolled students at any college or university — undergraduate, postgraduate, or doctoral. Candidates who have already graduated are not eligible for this cycle.', section: 'About the internship' },
  { question: '1.5 Is this the same as IIT Ropar\'s official Summer Research Internship?', answer: 'No. Summership 2026 is a VLED Lab initiative. The certificate is issued by the Vicharanashala Lab for Education Design, not centrally by the institute.', section: 'About the internship' },
  { question: '1.6 I have to attend my class tomorrow/today/some day can I take leave', answer: 'Leave is not permitted. If you are also attending classes or exams, you will be relieved from the internship immediately and will need to join the next batch when it starts.', section: 'About the internship' },
  
  { question: '2.1 When can I start?', answer: 'You can start any time in 2026 — VINS is flexible on the start date but your internship must finish by 31 December 2026. The earlier you join, the more of the May–July main cohort you catch.', section: 'Timing and dates' },
  { question: '2.2 How long is the internship?', answer: 'Two months from your chosen start date, with an optional one-month grace period if you need it. End must land on or before 31 December 2026.', section: 'Timing and dates' },
  { question: '2.3 Can I start in July, August or later if I have exams now?', answer: 'Yes — but only if your exams genuinely make an earlier start impossible. Wait until your exams are done, then opt in and start.', section: 'Timing and dates' },
  { question: '2.4 Can I start with the cohort and take a relaxation during my exam window?', answer: 'No. This is not an arrangement we offer. VINS is a full-attention internship — six to ten hours a day.', section: 'Timing and dates' },
  { question: '2.5 Can I take leave or get an exemption during the internship for an exam scheduled in June?', answer: 'The attendance rule is firm — the 55-day continuous window is a non-negotiable part of the internship.', section: 'Timing and dates' },
  { question: '2.6 Are orientation session recordings shared with interns?', answer: 'Recordings of the sessions will not be provided. However, we may provide access to an abridged version of a talk or session if we consider it important.', section: 'Timing and dates' },
  
  { question: '3.1 What dates do I put on the NOC?', answer: 'Default: your chosen start date → your start + 2 months (with up to 1 month grace), ensuring the end date is on or before 31 December 2026.', section: 'NOC (No Objection Certificate)' },
  { question: '3.2 Who can sign the NOC?', answer: 'Any authorised signatory at your college: HOD, Acting HOD (during holidays), Principal, Dean, Director, or Training & Placement Officer.', section: 'NOC (No Objection Certificate)' },
  { question: '3.3 When do I submit the NOC? Is the deadline hard?', answer: 'There is no specific calendar cut-off date but your internship cannot formally begin until your official institutional NOC has been uploaded and validated by us.', section: 'NOC (No Objection Certificate)' },
  { question: '3.4 What format should I use? Do I need to design it myself?', answer: 'No — we provide a printable NOC format. Download it from your dashboard, get it signed and stamped, scan it, and upload.', section: 'NOC (No Objection Certificate)' },
  { question: '3.5 What if my college gives me an NOC in their own format?', answer: 'A college\'s own NOC format is acceptable as long as all required entries are present: signature, name/designation/email/phone of signatory, your full name, internship period, and your signature.', section: 'NOC (No Objection Certificate)' },
  { question: '3.6 Does it need to be signed by hand?', answer: 'Yes. Three things are required: the authorised signatory\'s handwritten signature, the institutional rubber stamp/seal, and the signatory\'s email address.', section: 'NOC (No Objection Certificate)' },
  { question: '3.7 Can my HOD email the NOC instead of signing a printout?', answer: 'Yes. Download the text NOC, email it to your HOD, and ask them to forward it to sudarshan@iitrpr.ac.in with subject "NOC for my student Your Full Name".', section: 'NOC (No Objection Certificate)' },
  { question: '3.8 How do I download and upload the NOC?', answer: 'Both happen on your dashboard at samagama.in. Look for "Download blank NOC" and "Upload signed NOC (PDF)" buttons.', section: 'NOC (No Objection Certificate)' },
  { question: '3.9 What if my NOC is not formally verified?', answer: 'NOC verification takes typically between an hour and one full working day. Upload a self-declaration for a provisional offer letter while waiting.', section: 'NOC (No Objection Certificate)' },
  { question: '3.10 My online course won\'t issue an NOC. What do I do?', answer: 'The internship is open only to candidates currently enrolled in a full-time degree programme at a recognised college or university.', section: 'NOC (No Objection Certificate)' },
  { question: '3.11 My HOD wants written confirmation before signing. What do I show them?', answer: 'Use the provisional offer letter route: upload a self-declaration on your dashboard to get an immediate provisional offer letter.', section: 'NOC (No Objection Certificate)' },
  { question: '3.12 Can Prof. Sudarshan Iyengar sign my NOC?', answer: 'No. Your NOC must be signed by an authorised signatory at the institution where you are enrolled as a student.', section: 'NOC (No Objection Certificate)' },
  
  { question: '4.1 How do I know I am selected?', answer: 'If you can see your yellow VINS result panel on samagama.in, you are selected.', section: 'Selection, offer letter, and certificate' },
  { question: '4.2 How do I opt into VINS?', answer: 'Tell Yaksha in the chat: "I want to take up the online internship without stipend."', section: 'Selection, offer letter, and certificate' },
  { question: '4.3 When do I get the offer letter?', answer: 'Your offer letter is issued automatically. Upload a self-declaration for a provisional offer immediately, or upload your signed NOC first for the formal offer.', section: 'Selection, offer letter, and certificate' },
  { question: '4.4 Will I get a certificate?', answer: 'Yes — every intern who completes the internship gets a certificate from Vicharanashala, IIT Ropar.', section: 'Selection, offer letter, and certificate' },
  { question: '4.5 How do I confirm my internship dates?', answer: 'Log in to samagama.in and use the "Confirm your internship dates" card on your dashboard.', section: 'Selection, offer letter, and certificate' },
  { question: '4.6 I am a minor/major in AI student, can I join?', answer: 'Minor/Major in AI course from IIT Ropar is a certification course. Kindly write to us separately for this.', section: 'Selection, offer letter, and certificate' },
  { question: '4.7 How do I accept the offer letter?', answer: 'Reply All on the offer-letter thread with the exact acceptance statement printed, with your full name inserted and a date added.', section: 'Selection, offer letter, and certificate' },
  { question: '4.8 What if I reply without using the exact acceptance format?', answer: 'The offer is withdrawn, effective immediately, with no further correspondence. The withdrawal is final.', section: 'Selection, offer letter, and certificate' },
  { question: '4.9 I received a withdrawal email. Can it be reversed?', answer: 'Yes, there is an appeal path. Send a fresh email to sudarshansudarshan@gmail.com with subject exactly: "Request to Reconsider: Confirmation Reply Error"', section: 'Selection, offer letter, and certificate' },
  { question: '4.10 What happens after I send my acceptance? My dashboard doesn\'t update.', answer: 'The dashboard does not track the acceptance email. If your reply was compliant, no further action is needed.', section: 'Selection, offer letter, and certificate' },
  { question: '4.11 Can I change my internship dates?', answer: 'Before the offer letter is issued: yes. After the offer letter is issued: no.', section: 'Selection, offer letter, and certificate' },
  { question: '4.12 When and how do I get the Zoom link for the kickoff meeting?', answer: 'The kickoff link is delivered through email and your Yaksha chat portal on samagama.in.', section: 'Selection, offer letter, and certificate' },
  { question: '4.13 My NOC is not ready but my start date is approaching. What do I do?', answer: 'Upload a self-declaration on your dashboard for a provisional offer letter.', section: 'Selection, offer letter, and certificate' },
  { question: '4.14 When does my internship actually begin?', answer: 'Your internship begins on the start date you confirmed on the dashboard, provided your NOC has been validated.', section: 'Selection, offer letter, and certificate' },
  { question: '4.15 Can I switch from VINS (online) to VISE (offline)?', answer: 'No. The two tracks are finalised at the interview stage, and we do not move candidates between them.', section: 'Selection, offer letter, and certificate' },
  { question: '4.16 Can I change my internship dates after the offer letter?', answer: 'No. Once your offer letter has been issued, the dates are final.', section: 'Selection, offer letter, and certificate' },
  { question: '4.17 How do I get the link for the daily Zoom standups?', answer: 'Daily Zoom standup links are posted in the Announcements section on your samagama.in dashboard.', section: 'Selection, offer letter, and certificate' },
  { question: '4.18 How do I provide my Zoom ID?', answer: 'On your dashboard, just before "Start the internship," enter the exact email address linked to your Zoom account.', section: 'Selection, offer letter, and certificate' },
  { question: '4.19 I saved the wrong Zoom ID — can I change it?', answer: 'No. Once saved, your Zoom ID is final. Log in and tell us in the chat with #escalate.', section: 'Selection, offer letter, and certificate' },
  
  { question: '5.1 What will I work on?', answer: 'A real open-source project from Vicharanashala\'s portfolio — areas range across AI/ML, web development, NLP, computer vision, agriculture-tech, and education-tech.', section: 'Work, mentorship, and projects' },
  { question: '5.2 How many hours per day?', answer: 'Plan for 6 to 10 hours a day, sometimes more during the build phase.', section: 'Work, mentorship, and projects' },
  { question: '5.3 Who is my mentor?', answer: 'You will work with the lab\'s research and engineering team. The exact mentor depends on the project.', section: 'Work, mentorship, and projects' },
  { question: '5.4 Is there a stipend?', answer: 'No. The internship is unpaid.', section: 'Work, mentorship, and projects' },
  { question: '5.5 Do I need my own laptop?', answer: 'Yes — a personal laptop is required. We prefer Linux or macOS. If using Windows, install WSL or a terminal that can SSH.', section: 'Work, mentorship, and projects' },
  { question: '5.6 I am using a different email on GitHub/Zoom. Is that okay?', answer: 'No. Your registered email is your sole identifier across all programme platforms.', section: 'Work, mentorship, and projects' },
  { question: '5.7 Why has my mentor not been assigned yet?', answer: 'Mentors are not assigned on day 1. You will be assigned a mentor when you move to the project phase (Phase 2).', section: 'Work, mentorship, and projects' },
  
  { question: '6.1 What are the official communication channels?', answer: '1. Announcements section on samagama.in. 2. Yaksha chat on samagama.in. 3. Discussion forum. 4. Email to sudarshansudarshan@gmail.com as last resort.', section: 'Code of conduct — communication channels' },
  
  { question: '7.1 My interview is not marked as complete on the dashboard — what do I do?', answer: 'The team will check your record and manually mark it as complete if needed within 1–2 hours.', section: 'Interviews Related' },
  
  { question: '8.1 Does Vicharanashala send a grade report to my university?', answer: 'No. The certificate issued upon completion is the document you submit to your college for credit.', section: 'Certificate' },
  { question: '8.2 Does the certificate specify online or offline?', answer: 'No. The certificate is the same for both tracks and does not specify whether you completed it online or on campus.', section: 'Certificate' },
  { question: '8.3 Will the completion certificate be a physical hardcopy or an e-certificate?', answer: 'The completion certificate is issued as an e-certificate — you download it from your dashboard on samagama.in.', section: 'Certificate' },
  { question: '8.4 Is there a WhatsApp group for candidates?', answer: 'No. See section 6.1 for the official communication channels.', section: 'Certificate' },
  
  { question: '9.1 What is Rosetta?', answer: 'Rosetta is your internship journal — a 65-day document, one entry per day. You write in it daily, keep it privately, and submit it at the end.', section: 'Rosetta — your internship journal' },
  { question: '9.2 Why does this exist? Is it just busywork?', answer: 'No. It exists to help you process your experience and give us qualitative insight into your internship journey.', section: 'Rosetta — your internship journal' },
  { question: '9.3 What is a "thinking routine"?', answer: 'A short framework that gives your reflection a specific shape. Examples: 3-2-1, Muddy/Clear, What?/So What?/Now What?', section: 'Rosetta — your internship journal' },
  { question: '9.4 How do I get my Rosetta journal?', answer: 'Your journal will be shared with you as a Google Doc template link during orientation.', section: 'Rosetta — your internship journal' },
  { question: '9.5 How do I use it day to day?', answer: 'Open your Rosetta Google Doc, scroll to today\'s entry, fill in the date, read the thinking routine, answer the prompts, close it.', section: 'Rosetta — your internship journal' },
  { question: '9.6 How long should each entry be?', answer: 'There is no minimum or maximum word count. Three to five sentences per prompt is usually enough.', section: 'Rosetta — your internship journal' },
  { question: '9.7 What is the one rule?', answer: 'Write what is true. Not what sounds impressive. Not what you think we want to read.', section: 'Rosetta — your internship journal' },
  { question: '9.8 Can I use ChatGPT or any AI tool to write my entries?', answer: 'No. This is the one firm rule of Rosetta. Entries that read as AI-generated will not be counted.', section: 'Rosetta — your internship journal' },
  { question: '9.9 What if I miss a day?', answer: 'Fill it in as soon as you can. Write the actual date you are filling it in, not the date of the missed entry.', section: 'Rosetta — your internship journal' },
  { question: '9.10 Will anyone read my journal during the internship?', answer: 'No. We will not access your journal during the 65 days. The only time we read it is after you submit it at the end.', section: 'Rosetta — your internship journal' },
  { question: '9.11 Can the prompts change mid-internship?', answer: 'Occasionally we may update a prompt. When this happens, we will announce it in the Announcements section.', section: 'Rosetta — your internship journal' },
  { question: '9.12 How do I submit Rosetta at the end?', answer: 'On or before Day 65, share your Rosetta Google Doc with the programme coordinator\'s email with Viewer permission.', section: 'Rosetta — your internship journal' },
  { question: '9.13 I have a question about Rosetta that is not answered here.', answer: 'Ask Yaksha first. If Yaksha cannot answer it, escalate to your programme coordinator.', section: 'Rosetta — your internship journal' },
  { question: '9.14 My college requires written confirmation this is self-paced.', answer: 'This is not a self paced internship, but a very rigorous one which is time demanding.', section: 'Rosetta — your internship journal' },
  
  { question: '10.1 I\'ve previously interned with VLED — am I exempt from any coursework?', answer: 'Yes — partially. If you previously interned with VLED and completed the MERN Stack coursework, you don\'t need to repeat it. AI Fundamentals is mandatory for everyone.', section: 'Phase 1 — coursework, Vibe LMS, and live sessions' },
  { question: '10.2 How do I register for the AI Fundamentals course on Vibe?', answer: 'Click the AI Fundamentals registration link posted in the Announcements section. Create a Vibe account with the same Gmail used on Samagama, log in, and complete the registration form.', section: 'Phase 1 — coursework, Vibe LMS, and live sessions' },
  { question: '10.3 I registered on Vibe with a different email — is that OK?', answer: 'Please use the same email on both platforms. If your Samagama email is not Gmail, you may use any Gmail on Vibe, then tell Yaksha using the tag: #vibe-email your-gmail@gmail.com', section: 'Phase 1 — coursework, Vibe LMS, and live sessions' },
  { question: '10.4 Are live sessions mandatory if I am on the viva route?', answer: 'Yes — live sessions are mandatory for every intern, regardless of path.', section: 'Phase 1 — coursework, Vibe LMS, and live sessions' },
  { question: '10.5 Where do I find the daily live-session schedule?', answer: 'The daily live-session schedule is posted in the Announcements section on samagama.in at least 1 hour before the session begins.', section: 'Phase 1 — coursework, Vibe LMS, and live sessions' },
  { question: '10.6 Can we register and start the vibe courses before our internship date formally starts?', answer: 'No. You will receive the Vibe course link only after your internship starts.', section: 'Phase 1 — coursework, Vibe LMS, and live sessions' },
  { question: '10.7 What are the attendance and participation rules?', answer: 'Attendance and participation are tracked against strict thresholds. Missing standups is treated as missing work.', section: 'Phase 1 — coursework, Vibe LMS, and live sessions' }
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await FAQ.deleteMany({});
    await FAQ.insertMany(faqs);
    console.log('Saved ' + faqs.length + ' FAQs with sections to database');
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });