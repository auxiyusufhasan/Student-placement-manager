const { getStudents, getRoles, createStudent, createRole } = require("./db");

const demoStudents = [
  {
    name: "DEMO · Aarav Mehta", email: "aarav.mehta@example.test", course: "Computer Science", graduation_year: 2027,
    placement_status: "Applied", company_name: "", skills: "Java, Spring Boot, SQL, Git, REST APIs, Docker",
    cv_text: "Computer Science student focused on backend engineering and service development. Built a Spring Boot inventory API with role-based access and SQL persistence. Added Docker-based local development and automated endpoint checks. Completed a summer internship supporting Java microservices and database query optimization.",
    interview_date: null, follow_up_notes: "Demo profile. Follow up after technical screen.",
  },
  {
    name: "DEMO · Diya Nair", email: "diya.nair@example.test", course: "Information Technology", graduation_year: 2027,
    placement_status: "Interview", company_name: "Northstar Digital", skills: "React, TypeScript, Node.js, HTML, CSS, accessibility",
    cv_text: "Frontend developer with experience building responsive React applications in TypeScript. Created an accessible campus events portal with reusable components and API-backed search. Worked with designers to improve keyboard navigation and mobile layouts. Familiar with Node.js services, Git workflows, and component testing.",
    interview_date: "2026-12-04T10:30", follow_up_notes: "Demo interview. Ask about accessibility and component design.",
  },
  {
    name: "DEMO · Fatima Sheikh", email: "fatima.sheikh@example.test", course: "Data Science", graduation_year: 2026,
    placement_status: "Selected", company_name: "Microsoft", skills: "Python, SQL, pandas, Power BI, machine learning, statistics",
    cv_text: "Data Science graduate who turns operational data into clear product insights. Built a Python and pandas demand forecasting project and presented results in a Power BI dashboard. Used SQL to prepare and validate a multi-year dataset. Coursework includes applied statistics, model evaluation, and responsible machine learning.",
    interview_date: null, follow_up_notes: "Demo profile. Selection email draft is ready to test.",
  },
  {
    name: "DEMO · Ishan Kapoor", email: "ishan.kapoor@example.test", course: "Software Engineering", graduation_year: 2027,
    placement_status: "Applied", company_name: "", skills: "React, JavaScript, Node.js, Express, MongoDB, REST APIs",
    cv_text: "Software Engineering student building full-stack web products with React and Node.js. Developed a student society booking platform with Express endpoints and a MongoDB database. Implemented responsive views, form validation, and REST API integration. Enjoys collaborative code reviews and shipping small, measurable improvements.",
    interview_date: null, follow_up_notes: "Demo profile. Application submitted.",
  },
  {
    name: "DEMO · Meera Joshi", email: "meera.joshi@example.test", course: "Cybersecurity", graduation_year: 2026,
    placement_status: "Interview", company_name: "", skills: "Linux, network security, SIEM, Python, incident response, cloud security",
    cv_text: "Cybersecurity graduate with hands-on practice in Linux administration and security monitoring. Investigated simulated incidents using SIEM alerts and wrote Python scripts to normalize event logs. Completed a network security capstone covering threat modeling, access controls, and incident response. Familiar with cloud identity and security fundamentals.",
    interview_date: "2026-12-08T14:00", follow_up_notes: "Demo interview. Review incident-response exercise.",
  },
  {
    name: "DEMO · Rohan Das", email: "rohan.das@example.test", course: "Electronics Engineering", graduation_year: 2027,
    placement_status: "Not Placed", company_name: "", skills: "C++, embedded systems, RTOS, MATLAB, PCB design, IoT",
    cv_text: "Electronics Engineering student interested in embedded systems and connected devices. Built a sensor-based energy monitor using C++ on a microcontroller and tested real-time task scheduling. Designed a prototype PCB and analyzed sensor readings in MATLAB. Team project delivered an IoT dashboard for device status and alerts.",
    interview_date: null, follow_up_notes: "Demo profile. Explore embedded internships.",
  },
  {
    name: "DEMO · Zoya Fernandes", email: "zoya.fernandes@example.test", course: "Computer Science", graduation_year: 2027,
    placement_status: "Applied", company_name: "", skills: "Python, Django, PostgreSQL, REST APIs, Git, AWS",
    cv_text: "Computer Science student developing reliable web services with Python and Django. Built a volunteer coordination platform with PostgreSQL, REST APIs, and role-based access. Deployed a class project to AWS and documented its setup for teammates. Interested in backend engineering and cloud operations.",
    interview_date: null, follow_up_notes: "Demo profile. Review project deployment and API design.",
  },
  {
    name: "DEMO · Kabir Singh", email: "kabir.singh@example.test", course: "Business Analytics", graduation_year: 2026,
    placement_status: "Placed", company_name: "Google", skills: "SQL, Tableau, Excel, Python, data visualization, statistics",
    cv_text: "Business Analytics graduate with experience translating customer data into operational recommendations. Built Tableau dashboards and Excel models for a retail analytics capstone. Used SQL and Python to clean survey data, compare cohorts, and explain trends to nontechnical stakeholders. Strong grounding in statistics and experiment design.",
    interview_date: null, follow_up_notes: "Demo profile. Placement complete.",
  },
  {
    name: "DEMO · Ananya Bose", email: "ananya.bose@example.test", course: "Human-Computer Interaction", graduation_year: 2027,
    placement_status: "Interview", company_name: "Northstar Digital", skills: "Figma, UX research, prototyping, accessibility, usability testing, HTML",
    cv_text: "Human-Computer Interaction student focused on usable and inclusive digital products. Planned usability sessions and synthesized findings into accessible prototypes in Figma. Redesigned a student services flow using keyboard testing and clear content hierarchy. Comfortable collaborating with frontend developers and using HTML and CSS for prototypes.",
    interview_date: "2026-12-10T11:00", follow_up_notes: "Demo interview. Discuss research methods and accessibility choices.",
  },
  {
    name: "DEMO · Vivaan Rao", email: "vivaan.rao@example.test", course: "Software Engineering", graduation_year: 2026,
    placement_status: "Selected", company_name: "CloudAxis", skills: "Java, Spring Boot, microservices, SQL, Docker, Kubernetes",
    cv_text: "Software Engineering graduate with internship experience building Java microservices. Implemented Spring Boot services backed by SQL and containerized local environments with Docker. Worked with a team to improve API observability and document deployment steps. Familiar with Kubernetes concepts and automated build pipelines.",
    interview_date: null, follow_up_notes: "Demo profile. Selection email draft is ready to test.",
  },
  {
    name: "DEMO · Sara Khan", email: "sara.khan@example.test", course: "Artificial Intelligence", graduation_year: 2027,
    placement_status: "Applied", company_name: "", skills: "Python, machine learning, PyTorch, NLP, pandas, model evaluation",
    cv_text: "Artificial Intelligence student exploring language technologies and practical machine learning. Trained and evaluated a text classification model with Python and PyTorch for a course project. Used pandas to prepare data and compared model performance across test sets. Interested in responsible AI and clear experiment reporting.",
    interview_date: null, follow_up_notes: "Demo profile. Application submitted.",
  },
  {
    name: "DEMO · Arjun Patel", email: "arjun.patel@example.test", course: "Mechanical Engineering", graduation_year: 2027,
    placement_status: "Not Placed", company_name: "", skills: "CAD, SolidWorks, MATLAB, FEA, 3D printing, manufacturing",
    cv_text: "Mechanical Engineering student with hands-on product design and prototyping experience. Modeled a lightweight test fixture in SolidWorks and used finite element analysis to compare design options. Fabricated and tested a 3D-printed prototype, then documented manufacturing improvements. Comfortable analyzing results in MATLAB.",
    interview_date: null, follow_up_notes: "Demo profile. Explore design and manufacturing roles.",
  },
  {
    name: "DEMO · Priya Menon", email: "priya.menon@example.test", course: "Economics and Analytics", graduation_year: 2026,
    placement_status: "Interview", company_name: "", skills: "Excel, SQL, Power BI, forecasting, financial modeling, communication",
    cv_text: "Economics graduate applying quantitative analysis to planning and business questions. Built a forecasting model in Excel and Power BI to explain seasonal demand changes. Used SQL to combine transactional data and validated the results against source totals. Presented concise recommendations to a mixed technical and business audience.",
    interview_date: "2026-12-12T09:30", follow_up_notes: "Demo interview. Review assumptions and communication of results.",
  },
  {
    name: "DEMO · Dev Malhotra", email: "dev.malhotra@example.test", course: "Information Security", graduation_year: 2027,
    placement_status: "Applied", company_name: "", skills: "Linux, Python, SIEM, vulnerability assessment, networking, incident response",
    cv_text: "Information Security student building practical skills in monitoring and incident response. Analyzed sample SIEM events and wrote Python utilities to summarize suspicious login activity. Completed a vulnerability assessment lab covering network services and remediation notes. Interested in security operations and cloud infrastructure.",
    interview_date: null, follow_up_notes: "Demo profile. Awaiting application review.",
  },
  {
    name: "DEMO · Nisha Verma", email: "nisha.verma@example.test", course: "Bioinformatics", graduation_year: 2026,
    placement_status: "Selected", company_name: "Helix Labs", skills: "Python, R, SQL, genomics, statistics, data visualization",
    cv_text: "Bioinformatics graduate combining statistical methods with biological data analysis. Used Python and R to clean and visualize a public genomics dataset for a research capstone. Wrote SQL queries for sample metadata and documented quality checks. Presented methods, limitations, and findings in a concise lab report.",
    interview_date: null, follow_up_notes: "Demo profile. Selection email draft is ready to test.",
  },
  {
    name: "DEMO · Aditya Sen", email: "aditya.sen@example.test", course: "Cloud Computing", graduation_year: 2027,
    placement_status: "Applied", company_name: "", skills: "AWS, Linux, Docker, Terraform, Kubernetes, CI/CD",
    cv_text: "Cloud Computing student automating repeatable development environments. Created a containerized service with Docker and deployed a lab environment on AWS. Used Terraform to describe infrastructure and added basic CI checks to a Git workflow. Familiar with Linux operations, Kubernetes fundamentals, and cloud monitoring.",
    interview_date: null, follow_up_notes: "Demo profile. Application submitted.",
  },
];

const demoRoles = [
  { company: "Microsoft", title: "Junior Data Analyst", skills: "Python, SQL, pandas, Power BI, statistics", description: "Entry-level analytics role for product and operations reporting." },
  { company: "CloudAxis", title: "Java Backend Engineer", skills: "Java, Spring Boot, SQL, REST APIs, Docker", description: "Build and support cloud-based backend services." },
  { company: "Northstar Digital", title: "Frontend Developer", skills: "React, TypeScript, Node.js, HTML, CSS", description: "Create accessible, responsive customer-facing web experiences." },
];

async function seedDemoData() {
  const [students, roles] = await Promise.all([getStudents(), getRoles()]);
  const existingEmails = new Set(students.map((student) => student.email.toLowerCase()));
  const existingRoles = new Set(roles.map((role) => `${role.company.toLowerCase()}|${role.title.toLowerCase()}`));
  let addedStudents = 0;
  let addedRoles = 0;
  for (const student of demoStudents) {
    if (!existingEmails.has(student.email.toLowerCase())) {
      await createStudent({ ...student, company_name: student.company_name || null });
      addedStudents += 1;
    }
  }
  for (const role of demoRoles) {
    if (!existingRoles.has(`${role.company.toLowerCase()}|${role.title.toLowerCase()}`)) {
      await createRole(role);
      addedRoles += 1;
    }
  }
  console.log(`Demo seed complete: ${addedStudents} students and ${addedRoles} roles added. Demo names and emails are clearly marked.`);
}

seedDemoData().catch((error) => {
  console.error("Could not add demo data:", error);
  process.exitCode = 1;
});
