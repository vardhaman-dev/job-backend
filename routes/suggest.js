const express = require("express");
const router = express.Router();
const { sequelize } = require("../config/database");

const DEBUG = true; // Toggle this off in production


const CATEGORIES_TAGS = {
  "Information Technology": [
    "it", "software", "developer", "engineer", "technology", "java", "python", "cloud", "data",
    "frontend", "backend", "react", "nodejs", "ai", "ml", "devops", "fullstack", "cybersecurity",
    "web", "mobile", "ios", "android", "qa", "testing", "aws", "azure", "gcp", "database",
    "sql", "nosql", "mongodb", "postgresql", "api", "rest", "graphql", "agile", "scrum", "kubernetes",
    "microservices", "blockchain", "iot", "security", "network", "system", "analyst", "administrator",
    "architect", "saas", "paas", "iaas", "big data", "hadoop", "spark", "machine learning",
    "deep learning", "nlp", "computer vision", "ux", "ui", "product management", "technical support",
    "linux", "windows server", "networking", "c++", "c#", "dotnet", "php", "ruby", "go", "swift",
    "kotlin", "typescript", "vue", "angular", "ci/cd", "continuous integration", "continuous deployment",
    "containerization", "virtualization", "storage", "performance", "scalability", "documentation",
    "telecommunications", "sap", "oracle", "salesforce", "erp", "crm development", "bi", "business intelligence"
  ],
  "Marketing & Sales": [
    "marketing", "sales", "seo", "content", "branding", "digital", "customer", "lead", "campaign",
    "ads", "email", "social", "market research", "copywriting", "crm", "public relations",
    "pr", "inbound", "outbound", "growth", "strategy", "analytics", "data analysis", "ppc",
    "sem", "affiliate", "influencer", "e-commerce", "retail", "business development", "b2b",
    "b2c", "account management", "channel sales", "cold calling", "negotiation", "prospecting",
    "salesforce", "hubspot", "marketo", "event planning", "product marketing", "demand generation",
    "lead generation", "conversion rate optimization", "cro", "smm", "social media marketing",
    "community management", "market segmentation", "competitive analysis", "brand management",
    "promotions", "advertising", "media planning", "trademarketing", "merchandising", "customer success"
  ],
  "Finance & Accounting": [
    "finance", "accounting", "audit", "tax", "budget", "investment", "ledger", "payroll",
    "compliance", "invoicing", "financial analysis", "forecasting", "bookkeeping", "cpa",
    "cfa", "financial planning", "risk management", "securities", "trading", "equity",
    "debt", "banking", "treasury", "corporate finance", "mergers", "acquisitions", "m&a",
    "financial reporting", "gaap", "ifrs", "accounts payable", "accounts receivable",
    "cost accounting", "internal audit", "external audit", "asset management", "wealth management",
    "loan processing", "credit analysis", "forex", "derivatives", "financial modeling",
    "capital markets", "stock market", "financial statement analysis", "quickbooks", "sap finance"
  ],
  "Human Resources": [
    "hr", "recruitment", "talent", "training", "employee", "relations", "onboarding", "payroll",
    "benefits", "performance", "hrms", "retention", "compensation", "learning", "development",
    "l&d", "hris", "workforce", "diversity", "inclusion", "dei", "succession planning",
    "job description", "interviewing", "sourcing", "background checks", "employee engagement",
    "labor law", "eeo", "equal employment opportunity", "conflict resolution", "coaching",
    "organizational development", "career development", "exit interviews", "hr operations",
    "hr consulting", "people analytics", "workplace safety", "osha", "employee wellness"
  ],
  "Business & Consulting": [
    "business", "consulting", "strategy", "management", "operations", "project", "analysis",
    "planning", "market research", "client", "solution design", "pmo", "program management",
    "change management", "process improvement", "lean", "six sigma", "supply chain", "logistics",
    "procurement", "quality assurance", "qa", "stakeholder management", "business process",
    "bpr", "business development", "bid management", "proposal writing", "negotiation",
    "team leadership", "data analysis", "analytics", "reporting", "strategic planning",
    "corporate strategy", "management consulting", "it consulting", "financial consulting",
    "operational excellence", "performance optimization", "customer experience", "cx"
  ],
  "Design & Creative": [
    "design", "creative", "graphics", "ui", "ux", "illustrator", "photoshop", "branding",
    "motion", "animation", "figma", "adobe", "wireframe", "prototyping", "indesign",
    "after effects", "premiere pro", "video editing", "photography", "typography", "layout",
    "storyboarding", "web design", "logo", "print design", "packaging design", "3d modeling",
    "autocad", "sketchup", "user research", "usability testing", "information architecture",
    "ia", "interaction design", "ixd", "visual design", "art direction", "creative direction",
    "fashion design", "interior design", "industrial design", "sound design", "game design"
  ],
  "Legal & Compliance": [
    "legal", "compliance", "contract", "law", "risk", "regulations", "policy", "attorney",
    "litigation", "intellectual property", "corporate law", "legal research", "paralegal",
    "legal assistant", "legal analysis", "due diligence", "governance", "grc",
    "litigation support", "e-discovery", "patents", "trademarks", "copyright", "mergers",
    "acquisitions", "labor law", "employment law", "real estate law", "family law",
    "criminal law", "environmental law", "privacy", "gdpr", "ccpa", "hipaa",
    "fraud", "investigation", "ethics", "regulatory affairs", "securities law"
  ],
  "Healthcare & Medical": [
    "healthcare", "medical", "nurse", "doctor", "clinic", "pharma", "patient",
    "public health", "hospital", "clinical", "lab", "radiology", "diagnosis",
    "physiotherapy", "medical assistant", "health informatics", "epidemiology",
    "emt", "biotech", "pharmacist", "dentist", "surgeon", "veterinarian", "therapist",
    "psychiatry", "oncology", "pediatrics", "cardiology", "neurology", "geriatrics",
    "radiography", "sonography", "medical billing", "medical coding", "hipaa compliance",
    "patient care", "electronic health records", "ehr", "health information systems",
    "his", "nursing care", "patient safety", "biostatistics", "clinical trials",
    "medical devices", "pharmaceutical sales", "regulatory affairs healthcare"
  ]
};

const CATEGORY_SKILLS = {
  
  "Marketing & Sales": [
    "SEO", "Content Writing", "Email Marketing", "CRM", "Campaign Management", "PPC",
    "SEM", "Social Media Marketing", "Market Research", "Copywriting", "Salesforce",
    "HubSpot", "Google Analytics", "Public Relations", "Brand Management", "E-commerce Strategy",
    "Lead Generation", "Digital Marketing", "Account Management", "Business Development",
    "Negotiation", "Customer Relationship Management", "Sales Funnel Management",
    "Data Analysis & Reporting", "A/B Testing", "Conversion Rate Optimization (CRO)",
    "Product Marketing", "Affiliate Marketing", "Influencer Marketing"
  ],
"Information Technology": [
    "JavaScript", "React", "Node.js", "Python", "SQL", "Git", "Docker", "AWS", "Azure",
    "GCP", "Kubernetes", "CI/CD", "DevOps", "Cybersecurity", "Java", "C++", "C#", "Go",
    "PHP", "Ruby on Rails", "Swift", "Kotlin", "TypeScript", "Vue.js", "Angular", "MongoDB",
    "PostgreSQL", "System Administration", "Network Security", "Cloud Architecture", "Data Science",
    "Machine Learning", "AI Development", "Blockchain", "IoT", "Frontend Development",
    "Backend Development", "Full Stack Development", "Mobile App Development", "UI/UX Design",
    "Agile Methodologies", "Scrum", "RESTful APIs", "Microservices", "Data Warehousing",
    "Big Data Analytics", "Linux", "Windows Server", "Technical Support"
  ],
  "Finance & Accounting": [
    "Accounting", "Audit", "Excel", "Financial Analysis", "Tax Planning", "GAAP", "IFRS",
    "Financial Modeling", "Budgeting", "Forecasting", "Payroll Management", "Bookkeeping",
    "QuickBooks", "SAP Finance", "Risk Management", "Investment Analysis", "Corporate Finance",
    "Treasury Management", "Compliance Reporting", "Accounts Payable/Receivable",
    "Financial Statement Analysis", "Credit Analysis", "Mergers & Acquisitions (M&A)",
    "Wealth Management", "Equity Research"
  ],
  "Human Resources": [
    "Recruitment", "Employee Relations", "HRMS", "Payroll Management", "Training & Development",
    "Compensation & Benefits", "Onboarding", "Performance Management", "Talent Acquisition",
    "HR Information Systems (HRIS)", "Labor Law Compliance", "Conflict Resolution",
    "Workforce Planning", "Organizational Development", "Diversity & Inclusion (DEI)",
    "Succession Planning", "Employee Engagement", "Coaching", "HR Analytics", "Workplace Safety (OSHA)"
  ],
  "Business & Consulting": [
    "Project Management", "Strategy Consulting", "Client Communication", "Market Analysis",
    "Process Improvement", "Change Management", "Data Analysis", "Lean Six Sigma",
    "Supply Chain Management", "Operations Management", "Business Process Mapping",
    "Stakeholder Management", "Program Management", "Strategic Planning",
    "Business Development", "Risk Assessment", "Quality Assurance", "Logistics",
    "Procurement", "Negotiation", "Team Leadership"
  ],
  "Design & Creative": [
    "UI Design", "UX Design", "Figma", "Photoshop", "Illustrator", "InDesign",
    "After Effects", "Premiere Pro", "Video Editing", "Branding", "Typography",
    "Wireframing & Prototyping", "User Research", "Usability Testing", "Animation",
    "3D Modeling", "Photography", "Web Design", "Visual Design", "Art Direction",
    "Creative Direction", "Storyboarding", "Print Design"
  ],
  "Legal & Compliance": [
    "Contract Law", "Compliance Management", "Legal Research", "Risk Management",
    "Corporate Law", "Intellectual Property Law", "Litigation Support", "Due Diligence",
    "Regulatory Compliance (GDPR, HIPAA, etc.)", "Paralegal Skills", "Legal Writing",
    "Policy Development", "Ethics", "Privacy Law", "Securities Law", "Labor & Employment Law"
  ],
  "Healthcare & Medical": [
    "Clinical Procedures", "Patient Care", "Medical Terminology", "Healthcare Management",
    "EHR Systems (Epic, Cerner)", "Medical Billing & Coding", "HIPAA Compliance",
    "Pharmacology", "Radiology", "Anatomy & Physiology", "Public Health", "Epidemiology",
    "Clinical Research", "Medical Assisting", "Patient Safety", "Emergency Medical Services (EMS)",
    "Infection Control", "Biostatistics", "Nursing Care", "Phlebotomy"
  ]
};

// Determine category from user title
const getCategoryFromTitle = (title) => {
  if (!title) return "Unknown";
  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES_TAGS)) {
    if (keywords.some(k => lowerTitle.includes(k))) return category;
  }
  return "Unknown";
};

// Compute missing skills for a user
const getMissingSkills = (userSkills, category) => {
  const categorySkills = CATEGORY_SKILLS[category] || [];
  return categorySkills.filter(skill => !userSkills.includes(skill));
};

// Parses either a JSON array or comma-separated string
const parseTags = (input) => {
  if (!input) return [];

  try {
    const parsed = typeof input === "string" ? JSON.parse(input) : input;

    if (Array.isArray(parsed)) {
      return parsed.map(s =>
        String(s)
          .replace(/^[\s,'"]+|[\s,'"]+$/g, "") // trims quotes, commas, spaces
      ).filter(Boolean);
    }

    return [];
  } catch {
    return String(input)
      .split(",")
      .map(s =>
        s.replace(/^[\s,'"]+|[\s,'"]+$/g, "")
      )
      .filter(Boolean);
  }
};

// Normalize skill/tag strings
const normalize = (str) =>
  str.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

const tokenize = (str) => normalize(str).split(/\s+/);

// Compute match score using Jaccard similarity
const computeMatch = (userSkills, jobTags, title = "") => {
  const userSet = new Set(userSkills.map(normalize));
  const jobSet = new Set([
    ...jobTags.map(normalize),
    ...tokenize(title).filter((word) => word.length > 2),
  ]);

  const matches = [...userSet].filter((skill) => jobSet.has(skill));

  return userSet.size + jobSet.size === 0
    ? 0
    : +(2 * matches.length / (userSet.size + jobSet.size)).toFixed(2);
};

router.get("/suggest/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (DEBUG) console.log("🔍 Received request for user ID:", userId);

    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Fetch user skills from job_seeker_profiles
    const userResult = await sequelize.query(
      "SELECT skills_json FROM job_seeker_profiles WHERE user_id = ?",
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!userResult.length) {
      if (DEBUG) console.log("⚠️ No user found in job_seeker_profiles");
      return res.status(404).json({ error: "User not found" });
    }

    if (DEBUG) console.log("🧾 Raw skills_json from DB:", userResult[0].skills_json);

    let userSkills = [];
    try {
      userSkills = JSON.parse(userResult[0].skills_json || "[]");
    } catch (err) {
      console.error("❌ Failed to parse user skills:", err.message);
      return res.status(400).json({ error: "Invalid skills format" });
    }

   if (!Array.isArray(userSkills) || userSkills.length === 0) {
  if (DEBUG) console.log("⚠️ User has no skills listed — showing latest jobs instead");

  const latestJobs = await sequelize.query(
   `SELECT j.id, j.title, c.company_name, j.tags, j.location, 
          j.salary_range, j.type, j.posted_at, j.skills, j.experience_min
   FROM jobs j
   LEFT JOIN company_profiles c ON j.company_id = c.user_id
   WHERE j.status = 'open'
     AND c.status = 'approved' 
   LIMIT 100`,
  { type: sequelize.QueryTypes.SELECT }
  );

  const suggestions = latestJobs.map(job => ({
    jobId: job.id,
    company_name: job.company_name || "Unknown",
    title: job.title || "Untitled",
    location: job.location || "N/A",
    experience_min: job.experience_min || 0,
    type: job.type || "N/A",
    salary: job.salary_range || "N/A",
    skills: parseTags(job.skills) || [],
    postedAt: job.posted_at || "N/A",
    match: 0
  }));

  return res.json(suggestions);
}


    if (DEBUG) console.log("✅ Parsed user skills:", userSkills);

    // Fetch open jobs
    const jobs = await sequelize.query(
  `SELECT j.id, j.title, c.company_name, j.tags, j.location, 
          j.salary_range, j.type, j.posted_at, j.skills, j.experience_min
   FROM jobs j
   LEFT JOIN company_profiles c ON j.company_id = c.user_id
   WHERE j.status = 'open'
   LIMIT 100`,
  { type: sequelize.QueryTypes.SELECT }
);


    if (DEBUG) console.log("📦 Jobs fetched:", jobs.length);

    // Compute suggestions
    const suggestions = jobs.map((job) => {
      if (DEBUG) console.log(`\n🔹 Processing Job ID: ${job.id}, Title: "${job.title}"`);

      // ✅ Priority: use `skills` first, fallback to `tags`
      let jobTags = parseTags(job.skills);
      if (DEBUG) console.log("📎 Parsed skills:", jobTags);

      if (jobTags.length === 0) {
        jobTags = parseTags(job.tags);
        if (DEBUG) console.log("📎 Fallback to parsed tags:", jobTags);
      }

      const match = computeMatch(userSkills, jobTags, job.title);

      if (DEBUG) console.log("🎯 Match score:", match);

      return {
        jobId: job.id,
        company_name:job.company_name || "Unknown",
        title: job.title || "Untitled",
        location: job.location || "N/A",
        experience_min: job.experience_min || 0,
        type: job.type || "N/A",
        salary: job.salary_range || "N/A",
       skills: parseTags(job.skills) || "N/A",
        postedAt: job.posted_at || "N/A",
        match,
      };
    });

    // Sort by match score and prepare top 5 suggestions
    const topSuggestions = suggestions
      .filter((s) => s.match > 0)
      .sort((a, b) => b.match - a.match)
      .slice(0, 5);

    // Fallback if fewer than 5 matches
    if (topSuggestions.length < 5) {
      const fallback = suggestions
        .filter((s) => s.match === 0)
        .slice(0, 5 - topSuggestions.length);
      topSuggestions.push(...fallback);
    }

    if (DEBUG) {
      console.log("\n✅ Final top suggestions:");
      topSuggestions.forEach((s) =>
        console.log(`➡️  ${s.title} (${s.match})`)
      );
    }

    res.json(topSuggestions);
  } catch (err) {
    console.error("🔥 Suggestion error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/skills/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const [user] = await sequelize.query(
      "SELECT title, skills_json FROM job_seeker_profiles WHERE user_id = ?",
      { replacements: [userId], type: sequelize.QueryTypes.SELECT }
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
     
    let userSkills = [];
    try { userSkills = JSON.parse(user.skills_json || "[]"); } 
    catch { userSkills = []; }
    console.log("User skills:", userSkills);
    console.log("User title:", user.title);
    const category = getCategoryFromTitle(user.title);
    const missingSkills = getMissingSkills(userSkills, category);

    res.json({ success: true, category, suggestions: missingSkills });
  } catch (err) {
    console.error("🔥 Skill Suggestion Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
