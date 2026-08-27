export const MOCK_SKILL_BUILDER_LABS = [
  {
    id: "lab-001",
    title: "React Hero Section Complete Course",
    description: "Master the art of building stunning, responsive hero sections for your React applications",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    difficulty: "Beginner",
    duration: "3 hours",
    isFree: true,
    price: 0,
    tags: ["React", "CSS", "Frontend"],
    technologies: ["React", "Tailwind CSS", "JavaScript"],
    requirements: ["Basic HTML", "Basic CSS", "Basic JavaScript"],
    recommendedKnowledge: ["React components", "JSX"],
    whatYouWillLearn: [
      "How to design beautiful hero sections",
      "Responsive grid layouts",
      "Modern CSS animations",
      "Accessibility considerations"
    ],
    learningObjectives: [
      "Create responsive hero layouts",
      "Implement smooth animations",
      "Use modern CSS techniques"
    ],
    createdBy: "ALAR Labs",
    modules: [
      {
        id: "mod-001",
        title: "Introduction",
        lessons: [
          {
            id: "les-001",
            title: "What is a Hero Section",
            blocks: [
              {
                id: "block-001",
                type: "video",
                title: "Introduction to Hero Sections",
                videoUrl: "https://example.com/intro.mp4",
                description: "Learn what makes a great hero section and why it matters for conversions.",
                duration: "5:30"
              },
              {
                id: "block-002",
                type: "richText",
                content: "<h2>Why Hero Sections Matter</h2><p>The hero section is the first thing users see. It needs to communicate your value proposition clearly and quickly.</p>"
              },
              {
                id: "block-003",
                type: "image",
                title: "Hero Section Examples",
                imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
                caption: "Examples of great hero sections"
              }
            ]
          },
          {
            id: "les-002",
            title: "Course Overview",
            blocks: [
              {
                id: "block-004",
                type: "video",
                title: "What You'll Build",
                videoUrl: "https://example.com/overview.mp4",
                description: "A quick preview of the complete hero section we'll build together.",
                duration: "3:15"
              }
            ]
          }
        ]
      },
      {
        id: "mod-002",
        title: "Hero Section Components",
        lessons: [
          {
            id: "les-003",
            title: "Setting Up the Project",
            blocks: [
              {
                id: "block-005",
                type: "video",
                title: "Project Setup",
                videoUrl: "https://example.com/setup.mp4",
                description: "Let's create our React project and set up the basic structure.",
                duration: "8:00"
              },
              {
                id: "block-006",
                type: "richText",
                content: "<h2>Prerequisites</h2><ul><li>Node.js 18+</li><li>npm or yarn</li><li>Code editor</li></ul>"
              },
              {
                id: "block-007",
                type: "code",
                title: "Initialize React Project",
                language: "bash",
                code: "npx create-vite@latest hero-section -- --template react\ncd hero-section\nnpm install\nnpm run dev"
              },
              {
                id: "block-008",
                type: "quiz",
                question: "What tool do we use to initialize a React project?",
                options: ["Vue CLI", "Create React App", "Vite", "Angular CLI"],
                correctAnswer: 2,
                explanation: "We used Vite for fast project initialization."
              }
            ]
          },
          {
            id: "les-004",
            title: "Building the Hero Image",
            blocks: [
              {
                id: "block-009",
                type: "video",
                title: "Adding the Hero Image",
                videoUrl: "https://example.com/hero-image.mp4",
                description: "Learn how to add and optimize images in the hero section.",
                duration: "10:00"
              },
              {
                id: "block-010",
                type: "image",
                title: "Hero Image Placement",
                imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
                caption: "Hero image with proper placement"
              },
              {
                id: "block-011",
                type: "trueFalse",
                statement: "Images should always be at the top of the hero section.",
                correctAnswer: false,
                explanation: "Images can be placed on either side, below, or as backgrounds."
              },
              {
                id: "block-012",
                type: "code",
                title: "Image Component",
                language: "jsx",
                code: "function HeroImage() {\n  return (\n    <div className=\"hero-image\">\n      <img src=\"/hero.jpg\" alt=\"Hero\" />\n    </div>\n  );\n}"
              }
            ]
          }
        ]
      }
    ]
  }
];
