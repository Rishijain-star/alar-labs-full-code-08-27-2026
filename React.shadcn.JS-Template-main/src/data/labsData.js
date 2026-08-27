/**
 * ═══════════════════════════════════════════════════════════════
 *  ALAR Labs — Central Lab Data Store
 *  Add any new lab here. LabDetailPage auto-renders it.
 * ═══════════════════════════════════════════════════════════════
 *
 *  LAB CONTENT SCHEMA
 *  ──────────────────
 *  Each lab object has:
 *
 *  meta        → title, code, version, duration, credits, level, rating, platform
 *  toc         → [{ id, label, indent(0|1), isTask(bool) }]
 *  setupNotes  → string[]  (left panel accordion bullets)
 *  sections    → [Section]
 *
 *  Section types:
 *  ─────────────
 *  { type:"heading",   id, text, level("h1"|"h2"|"task") }
 *  { type:"para",      id(optional), text }
 *  { type:"list",      items: string[] }
 *  { type:"step",      id, number, title, content: [Block] }
 *  { type:"media",     id(optional), src, mediaType("image"|"video"|"youtube"), caption, alt }
 *  { type:"congrats",  labCode, summary }
 *
 *  Block (inside step.content):
 *  ─────────────────────────────
 *  { type:"para",    text }
 *  { type:"label",   text }
 *  { type:"list",    items: string[] }
 *  { type:"code",    language, code }
 *  { type:"table",   rows: [["Setting","Value"], ...] }
 *  { type:"banner",  variant("info"|"warning"|"success"|"tip"), text }
 *  { type:"media",   src, mediaType, caption, alt }
 *
 * ═══════════════════════════════════════════════════════════════
 */

export const LABS = {

  /* ════════════════════════════════════════════════════════════
     LAB 1 — Deploy a Kubernetes Cluster on AWS EKS
  ════════════════════════════════════════════════════════════ */
  "1": {
    meta: {
      title: "Deploy a Kubernetes Cluster on AWS EKS",
      code: "LAB-101-01-01",
      version: "v1.2",
      duration: "2 hours",
      credits: "7 Credits",
      level: "Intermediate",
      rating: 4.8,
      platform: "AWS",
      isFree: true,
      timerSec: 7200,
    },
    setupNotes: [
      "Use an Incognito / private browser window.",
      "Do not use your personal AWS account.",
      "Use only the credentials provided in Setup.",
      "Do not sign out during the lab session.",
    ],
    toc: [
      { id: "lab-overview", label: "Lab Overview", indent: 0 },
      { id: "objectives", label: "Objectives", indent: 0 },
      { id: "setup", label: "Setup & Requirements", indent: 0 },
      { id: "task-1", label: "Task 1: Create EKS Cluster", indent: 0, isTask: true },
      { id: "t1-s1", label: "Step 1: Configure AWS CLI", indent: 1 },
      { id: "t1-s2", label: "Step 2: Create Cluster", indent: 1 },
      { id: "t1-s3", label: "Step 3: Configure kubectl", indent: 1 },
      { id: "task-2", label: "Task 2: Deploy Application", indent: 0, isTask: true },
      { id: "t2-s1", label: "Step 1: Create Deployment", indent: 1 },
      { id: "t2-s2", label: "Step 2: Expose Service", indent: 1 },
      { id: "t2-s3", label: "Step 3: Verify Access", indent: 1 },
      { id: "task-3", label: "Task 3: Scale & Monitor", indent: 0, isTask: true },
      { id: "t3-s1", label: "Step 1: Scale Deployment", indent: 1 },
      { id: "t3-s2", label: "Step 2: View Cluster Health", indent: 1 },
      { id: "congratulations", label: "Congratulations!", indent: 0 },
    ],
    sections: [
      { type: "heading", id: "lab-overview", text: "Overview", level: "h2" },
      { type: "para", text: "In this lab you will deploy a production-ready Kubernetes cluster on Amazon EKS, configure node groups, deploy a sample application, and observe cluster scaling behaviour." },
      { type: "media", src: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800", mediaType: "image", caption: "Amazon EKS — Kubernetes on AWS", alt: "EKS overview" },
      { type: "heading", id: "objectives", text: "Objectives", level: "h2" },
      {
        type: "list", items: [
          "Create and configure an Amazon EKS cluster using eksctl",
          "Connect kubectl to the new cluster",
          "Deploy a containerised application to Kubernetes",
          "Expose a Deployment as a LoadBalancer Service",
          "Scale deployments horizontally and observe pod distribution",
          "Monitor cluster health with kubectl and CloudWatch",
        ]
      },
      { type: "heading", id: "setup", text: "Setup & Requirements", level: "h2" },
      {
        type: "step", id: "setup", number: "Prereqs", title: "Environment Requirements",
        content: [
          {
            type: "table", rows: [
              ["AWS CLI version", "2.x"],
              ["kubectl version", "1.27+"],
              ["eksctl version", "0.150+"],
              ["Region", "us-west-2"],
            ]
          },
          { type: "banner", variant: "warning", text: "Ensure AWS credentials are configured with AdministratorAccess before starting." },
        ]
      },
      { type: "heading", id: "task-1", text: "Task 1: Create EKS Cluster", level: "task" },
      { type: "para", text: "In this task you will use eksctl to create a managed EKS cluster with a node group." },
      {
        type: "step", id: "t1-s1", number: 1, title: "Step 1: Configure AWS CLI",
        content: [
          { type: "code", language: "bash", code: "aws configure\n# Enter your Access Key, Secret Key, region: us-west-2, output: json" },
          { type: "banner", variant: "success", text: "Result: aws sts get-caller-identity returns your account ID and ARN." },
        ]
      },
      {
        type: "step", id: "t1-s2", number: 2, title: "Step 2: Create the EKS Cluster",
        content: [
          {
            type: "code", language: "bash", code: `eksctl create cluster \\
  --name my-cluster \\
  --region us-west-2 \\
  --nodegroup-name standard-workers \\
  --node-type t3.medium \\
  --nodes 3` },
          { type: "banner", variant: "info", text: "This command takes approximately 15–20 minutes to complete. Do not close the terminal." },
          { type: "banner", variant: "success", text: "Result: eksctl prints 'EKS cluster my-cluster in region us-west-2 is ready'." },
        ]
      },
      {
        type: "step", id: "t1-s3", number: 3, title: "Step 3: Configure kubectl",
        content: [
          { type: "code", language: "bash", code: "aws eks update-kubeconfig --name my-cluster --region us-west-2\nkubectl get nodes" },
          { type: "banner", variant: "success", text: "Result: All 3 nodes show STATUS = Ready." },
        ]
      },
      { type: "heading", id: "task-2", text: "Task 2: Deploy Application", level: "task" },
      { type: "para", text: "In this task you will deploy a sample nginx application and expose it publicly." },
      {
        type: "step", id: "t2-s1", number: 1, title: "Step 1: Create Deployment",
        content: [
          {
            type: "code", language: "yaml", code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-app
  template:
    metadata:
      labels:
        app: nginx-app
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80` },
          { type: "code", language: "bash", code: "kubectl apply -f deployment.yaml\nkubectl get pods" },
        ]
      },
      {
        type: "step", id: "t2-s2", number: 2, title: "Step 2: Expose Service",
        content: [
          { type: "code", language: "bash", code: "kubectl expose deployment nginx-app --port=80 --type=LoadBalancer\nkubectl get svc nginx-app" },
          { type: "banner", variant: "info", text: "Wait 2–3 minutes for AWS to provision the Load Balancer and assign an external IP." },
        ]
      },
      {
        type: "step", id: "t2-s3", number: 3, title: "Step 3: Verify Access",
        content: [
          {
            type: "code", language: "bash", code: `# Get the LoadBalancer hostname
kubectl get svc nginx-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
# Open the URL in your browser` },
          { type: "banner", variant: "success", text: "Result: Browser shows the default nginx welcome page served from your EKS cluster." },
        ]
      },
      { type: "heading", id: "task-3", text: "Task 3: Scale & Monitor", level: "task" },
      {
        type: "step", id: "t3-s1", number: 1, title: "Step 1: Scale Deployment",
        content: [
          { type: "code", language: "bash", code: "kubectl scale deployment nginx-app --replicas=6\nkubectl get pods -w" },
          { type: "banner", variant: "success", text: "Result: 6 pods distributed across the 3 nodes." },
        ]
      },
      {
        type: "step", id: "t3-s2", number: 2, title: "Step 2: View Cluster Health",
        content: [
          { type: "code", language: "bash", code: "kubectl top nodes\nkubectl top pods" },
          { type: "banner", variant: "success", text: "Result: CPU and memory usage displayed for all nodes and pods." },
        ]
      },
      { type: "congrats", labCode: "LAB-101-01-01", summary: "You deployed a production-ready EKS cluster, deployed a containerised app, exposed it via a LoadBalancer, and scaled it horizontally." },
    ],
  },

  /* ════════════════════════════════════════════════════════════
     LAB 2 — Build a Serverless API with Azure Functions
  ════════════════════════════════════════════════════════════ */
  "2": {
    meta: {
      title: "Build a Serverless API with Azure Functions",
      code: "LAB-202-03-01",
      version: "v1.0",
      duration: "3 hours",
      credits: "8 Credits",
      level: "Advanced",
      rating: 4.9,
      platform: "Azure",
      isFree: false,
      price: 29,
      timerSec: 10800,
    },
    setupNotes: [
      "Use an Incognito / private browser window.",
      "Do not use your personal Azure account.",
      "Use only the credentials provided.",
      "Ensure Node.js 18+ is installed locally.",
    ],
    toc: [
      { id: "lab-overview", label: "Lab Overview", indent: 0 },
      { id: "objectives", label: "Objectives", indent: 0 },
      { id: "task-1", label: "Task 1: Create Function App", indent: 0, isTask: true },
      { id: "t1-s1", label: "Step 1: Create Resource Group", indent: 1 },
      { id: "t1-s2", label: "Step 2: Create Storage Account", indent: 1 },
      { id: "t1-s3", label: "Step 3: Create Function App", indent: 1 },
      { id: "task-2", label: "Task 2: Develop HTTP Functions", indent: 0, isTask: true },
      { id: "t2-s1", label: "Step 1: Create HTTP Trigger", indent: 1 },
      { id: "t2-s2", label: "Step 2: Add Cosmos DB Binding", indent: 1 },
      { id: "t2-s3", label: "Step 3: Deploy Functions", indent: 1 },
      { id: "task-3", label: "Task 3: Test & Monitor", indent: 0, isTask: true },
      { id: "t3-s1", label: "Step 1: Test via REST Client", indent: 1 },
      { id: "t3-s2", label: "Step 2: View Application Insights", indent: 1 },
      { id: "congratulations", label: "Congratulations!", indent: 0 },
    ],
    sections: [
      { type: "heading", id: "lab-overview", text: "Overview", level: "h2" },
      { type: "para", text: "In this lab you will build a fully serverless REST API using Azure Functions v4 (Node.js) with Cosmos DB for persistence and Application Insights for monitoring." },
      { type: "media", src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", mediaType: "image", caption: "Azure Serverless Architecture", alt: "Azure Functions" },
      { type: "heading", id: "objectives", text: "Objectives", level: "h2" },
      {
        type: "list", items: [
          "Create an Azure Function App with Node.js v4 runtime",
          "Build HTTP-triggered functions for GET and POST",
          "Bind functions to Azure Cosmos DB",
          "Deploy functions via Azure CLI",
          "Test endpoints using REST client",
          "Monitor with Application Insights",
        ]
      },
      { type: "heading", id: "task-1", text: "Task 1: Create Function App", level: "task" },
      {
        type: "step", id: "t1-s1", number: 1, title: "Step 1: Create Resource Group",
        content: [
          { type: "code", language: "bash", code: "az group create --name rg-serverless-lab --location eastus" },
          { type: "banner", variant: "success", text: "Result: Resource group rg-serverless-lab is created in East US." },
        ]
      },
      {
        type: "step", id: "t1-s2", number: 2, title: "Step 2: Create Storage Account",
        content: [
          { type: "code", language: "bash", code: "az storage account create \\\n  --name stfunclab001 \\\n  --resource-group rg-serverless-lab \\\n  --location eastus \\\n  --sku Standard_LRS" },
        ]
      },
      {
        type: "step", id: "t1-s3", number: 3, title: "Step 3: Create Function App",
        content: [
          {
            type: "table", rows: [
              ["Function App Name", "func-api-lab-001"],
              ["Resource Group", "rg-serverless-lab"],
              ["Runtime", "node"],
              ["Runtime version", "18"],
              ["Region", "East US"],
              ["Storage account", "stfunclab001"],
            ]
          },
          {
            type: "code", language: "bash", code: `az functionapp create \\
  --name func-api-lab-001 \\
  --resource-group rg-serverless-lab \\
  --storage-account stfunclab001 \\
  --runtime node \\
  --runtime-version 18 \\
  --functions-version 4 \\
  --consumption-plan-location eastus` },
        ]
      },
      { type: "heading", id: "task-2", text: "Task 2: Develop HTTP Functions", level: "task" },
      {
        type: "step", id: "t2-s1", number: 1, title: "Step 1: Create HTTP Trigger",
        content: [
          {
            type: "code", language: "javascript", code: `const { app } = require('@azure/functions');

app.http('getItems', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'items',
    handler: async (request, context) => {
        context.log('GET /items called');
        return { body: JSON.stringify({ items: [] }) };
    }
});` },
        ]
      },
      {
        type: "step", id: "t2-s2", number: 2, title: "Step 2: Add Cosmos DB Binding",
        content: [
          { type: "banner", variant: "tip", text: "Cosmos DB output bindings let you write data without SDK boilerplate — just return the document." },
          {
            type: "code", language: "json", code: `{
  "name": "outputDocument",
  "type": "cosmosDB",
  "direction": "out",
  "databaseName": "labdb",
  "containerName": "items",
  "createIfNotExists": true,
  "connectionStringSetting": "CosmosDBConnection"
}` },
        ]
      },
      {
        type: "step", id: "t2-s3", number: 3, title: "Step 3: Deploy Functions",
        content: [
          { type: "code", language: "bash", code: "func azure functionapp publish func-api-lab-001" },
          { type: "banner", variant: "success", text: "Result: All functions are deployed. CLI outputs the function URLs." },
        ]
      },
      { type: "heading", id: "task-3", text: "Task 3: Test & Monitor", level: "task" },
      {
        type: "step", id: "t3-s1", number: 1, title: "Step 1: Test via REST Client",
        content: [
          {
            type: "code", language: "bash", code: `# GET items
curl https://func-api-lab-001.azurewebsites.net/api/items

# POST item
curl -X POST https://func-api-lab-001.azurewebsites.net/api/items \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Test Item","category":"demo"}'` },
          { type: "banner", variant: "success", text: "Result: GET returns JSON array; POST returns the created document with an id." },
        ]
      },
      {
        type: "step", id: "t3-s2", number: 2, title: "Step 2: View Application Insights",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "Azure Portal → Function App → Application Insights → Live Metrics" },
          { type: "banner", variant: "success", text: "Result: Real-time invocation count, latency, and failure rate are visible." },
        ]
      },
      { type: "congrats", labCode: "LAB-202-03-01", summary: "You built a serverless REST API with Azure Functions, integrated Cosmos DB bindings, deployed via CLI, and verified monitoring with Application Insights." },
    ],
  },

  /* ════════════════════════════════════════════════════════════
     LAB-204-02-01 — Develop Storage Solution with Azure Storage (Java)
     ID "lab-204" used from LabsPage card  OR  use your own ID scheme
  ════════════════════════════════════════════════════════════ */
  "lab-204": {
    meta: {
      title: "Develop Storage Solution with Azure Storage",
      code: "LAB-204-02-01",
      version: "v2.1",
      duration: "45 minutes",
      credits: "5 Credits",
      level: "Intermediate",
      rating: 4.2,
      platform: "Azure",
      isFree: true,
      timerSec: 2700,
    },
    setupNotes: [
      "Use an Incognito / private browser window.",
      "Do not use your personal Azure account.",
      "Use only the credentials provided in Setup section.",
      "Do not sign out during the lab session.",
    ],
    toc: [
      { id: "lab-overview", label: "Lab Overview", indent: 0 },
      { id: "objectives", label: "Objectives", indent: 0 },
      { id: "task-1", label: "Task 1: Create Workstation", indent: 0, isTask: true },
      { id: "t1-s1", label: "Step 1: Create Azure VM", indent: 1 },
      { id: "t1-s2", label: "Step 2: Enable the Lock", indent: 1 },
      { id: "task-2", label: "Task 2: Deploy Java SDK & Eclipse", indent: 0, isTask: true },
      { id: "t2-s1", label: "Step 1: Copy Workstation IP", indent: 1 },
      { id: "t2-s2", label: "Step 2: Connect to Workstation", indent: 1 },
      { id: "t2-s3", label: "Step 3: Install Java", indent: 1 },
      { id: "t2-s4", label: "Step 4: Configure Env Variables", indent: 1 },
      { id: "t2-s5", label: "Step 5: Check Java Version", indent: 1 },
      { id: "t2-s6", label: "Step 6: Install Eclipse IDE", indent: 1 },
      { id: "t2-s7", label: "Step 7: Update the Project", indent: 1 },
      { id: "t2-s8", label: "Step 8: Configure Storage Credentials", indent: 1 },
      { id: "task-3", label: "Task 3: Manage Azure Storage", indent: 0, isTask: true },
      { id: "t3-s1", label: "Step 1: Create New Container", indent: 1 },
      { id: "t3-s2", label: "Step 2: Create Second Container", indent: 1 },
      { id: "t3-s3", label: "Step 3: List Containers", indent: 1 },
      { id: "t3-s4", label: "Step 4: View in Azure Portal", indent: 1 },
      { id: "t3-s5", label: "Step 5: Delete the Container", indent: 1 },
      { id: "t3-s6", label: "Step 6: List Containers Again", indent: 1 },
      { id: "t3-s7", label: "Step 7: Upload the Blob", indent: 1 },
      { id: "t3-s8", label: "Step 8: List the Blobs", indent: 1 },
      { id: "t3-s9", label: "Step 9: Download the Blob", indent: 1 },
      { id: "t3-s10", label: "Step 10: Read the Blob", indent: 1 },
      { id: "t3-s11", label: "Step 11: Read from Storage Account", indent: 1 },
      { id: "t3-s12", label: "Step 12: Upload Blob with Metadata", indent: 1 },
      { id: "t3-s13", label: "Step 13: Update Blob Metadata", indent: 1 },
      { id: "t3-s14", label: "Step 14: Create SAS URL", indent: 1 },
      { id: "t3-s15", label: "Step 15: Access from Browser", indent: 1 },
      { id: "t3-s16", label: "Step 16: Read Metadata", indent: 1 },
      { id: "task-4", label: "Task 4: Stop the Environment", indent: 0, isTask: true },
      { id: "t4-s1", label: "Step 1: Close Maven Project", indent: 1 },
      { id: "t4-s2", label: "Step 2: Stop the Workstation", indent: 1 },
      { id: "congratulations", label: "Congratulations!", indent: 0 },
    ],
    sections: [
      { type: "heading", id: "lab-overview", text: "Overview", level: "h2" },
      { type: "para", text: "You are preparing to store binary data in Azure. As a development team, you have decided to use Java to manage your Azure Storage operations. In this lab, you will create a virtual machine workstation, install the Java SDK and Eclipse IDE, connect to an Azure Storage account, and perform blob operations programmatically." },
      { type: "media", src: "https://learn.microsoft.com/en-us/azure/storage/blobs/media/storage-blob-introduction/blob1.png", mediaType: "image", caption: "Azure Blob Storage — Overview Architecture", alt: "Azure Blob Storage" },
      { type: "para", text: "By the end of this lab you will be able to create containers, list and delete them, upload and download blobs, attach metadata, and generate pre-signed SAS URLs — all from Java using the Azure Storage SDK." },

      { type: "heading", id: "objectives", text: "Objectives", level: "h2" },
      {
        type: "list", items: [
          "Create a new Blob container",
          "Delete an existing Blob container",
          "List all existing containers in the storage account",
          "List the contents of a container",
          "Upload blobs to a container",
          "Get (download) a blob from a container",
          "Upload a blob with metadata",
          "Update metadata on an existing blob",
          "Create a Pre-signed (SAS) URL",
          "Access a blob using the Pre-signed URL",
        ]
      },

      // ── TASK 1 ──
      { type: "heading", id: "task-1", text: "Task 1: Create Workstation", level: "task" },
      { type: "para", text: "In this task, you will create the virtual machine to build the development environment." },
      {
        type: "step", id: "t1-s1", number: 1, title: "Step 1: Create Azure Virtual Machine",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "Azure Portal → Virtual machines → Create → Azure Virtual Machine" },
          { type: "label", text: "Configuration — Basic tab:" },
          {
            type: "table", rows: [
              ["Subscription", "Select your Default subscription"],
              ["Resource Group", "Create new → Name: az-devec-rg"],
              ["VM Name", "dev-ec-ws"],
              ["Region", "West Europe"],
              ["Availability options", "No infrastructure redundancy required"],
              ["Security type", "Standard"],
              ["Image", "Windows 10 Pro, version 22H2 – x64 Gen2"],
              ["Size", "D2as_v5"],
              ["Username", "master"],
              ["Password", "Lab@password"],
              ["Inbound ports", "RDP (3389)"],
            ]
          },
          { type: "banner", variant: "warning", text: `On the Licensing tab, enable: "I confirm I have an eligible Windows 10 license with multi-tenant hosting rights."` },
          { type: "label", text: "Actions:" },
          { type: "list", items: ["Click through: Disks → Networking → Management → Monitoring → Advanced → Tags → Review + create.", "Click Create and wait for deployment."] },
          { type: "banner", variant: "success", text: 'Result: "Your deployment is complete." VM dev-ec-ws is visible in the resource group.' },
        ]
      },
      {
        type: "step", id: "t1-s2", number: 2, title: "Step 2: Enable the Lock",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "Azure Portal → Resource groups → open az-devec-rg → Locks (under Settings) → Add" },
          { type: "table", rows: [["Lock name", "Delete-Lock"], ["Lock type", "Delete"]] },
          { type: "list", items: ["Click OK."] },
          { type: "banner", variant: "success", text: "Result: Delete-Lock appears in the Locks list, preventing accidental deletion." },
        ]
      },

      // ── TASK 2 ──
      { type: "heading", id: "task-2", text: "Task 2: Deploy the Java SDK and Eclipse IDE", level: "task" },
      { type: "para", text: "In this task, you will build the development environment by installing Java and Eclipse on the workstation VM." },
      {
        type: "step", id: "t2-s1", number: 1, title: "Step 1: Copy the Workstation Public IP Address",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "Azure Portal → Virtual machines → open dev-ec-ws" },
          { type: "list", items: ["Copy the Public IP Address and save it in Notepad."] },
        ]
      },
      {
        type: "step", id: "t2-s2", number: 2, title: "Step 2: Connect to the Workstation",
        content: [
          { type: "list", items: ["Right-click Start → Run → type mstsc → OK.", "Enter the Public IP of dev-ec-ws → Connect."] },
          { type: "table", rows: [["Computer", "Public IP Address of dev-ec-ws"], ["Username", "master"], ["Password", "Lab@password"]] },
          { type: "list", items: ["Click OK to connect."] },
        ]
      },
      {
        type: "step", id: "t2-s3", number: 3, title: "Step 3: Install Java",
        content: [
          { type: "para", text: "From dev-ec-ws, download and install Java SE Development Kit 8 for Windows x64:" },
          { type: "code", language: "url", code: "https://bitbucket.org/ahmadzahoory/development/downloads/jdk-8u351-windows-x64.exe" },
          { type: "list", items: ["Run the installer and follow the on-screen steps."] },
        ]
      },
      {
        type: "step", id: "t2-s4", number: 4, title: "Step 4: Configure the Environment Variable",
        content: [
          {
            type: "list", items: [
              "Right-click Start → Run → type C:\\Program Files\\Java → OK.",
              "Open the JDK folder and copy the full path to Notepad.",
              "Right-click Start → Run → type sysdm.cpl → OK.",
              "System Properties → Advanced → Environment Variables.",
              "Under System variables → New:",
            ]
          },
          { type: "table", rows: [["Variable name", "JAVA_HOME"], ["Variable value", "Paste the JDK path copied above"]] },
          { type: "list", items: ["Click OK three times to save."] },
        ]
      },
      {
        type: "step", id: "t2-s5", number: 5, title: "Step 5: Check the Java Version",
        content: [
          { type: "code", language: "cmd", code: "java -version\necho %JAVA_HOME%" },
          { type: "banner", variant: "success", text: "Result: Java version 1.8.0_351 and JAVA_HOME path are printed." },
        ]
      },
      {
        type: "step", id: "t2-s6", number: 6, title: "Step 6: Install the Eclipse IDE",
        content: [
          {
            type: "list", items: [
              "Download Eclipse IDE for Java Developers from eclipse.org.",
              "Run the installer → select Eclipse IDE for Java Developers.",
              "Accept defaults → Install → Launch Eclipse.",
            ]
          },
        ]
      },
      {
        type: "step", id: "t2-s7", number: 7, title: "Step 7: Update the Project",
        content: [
          {
            type: "list", items: [
              "In Eclipse, right-click JRE System Library → Properties.",
              "Execution environment: select JavaSE-1.8 (jdk) → Apply and Close.",
              "Right-click azurestglab project → Maven → Update project.",
              "Check azurestglab → click OK.",
            ]
          },
        ]
      },
      {
        type: "step", id: "t2-s8", number: 8, title: "Step 8: Configure Storage Account Credentials",
        content: [
          { type: "para", text: "Open Executor.java in Eclipse (double-click):" },
          {
            type: "table", rows: [
              ["Line 16", "Replace STORAGE-ACCOUNT-NAME with: azstorage123"],
              ["Line 17", "Replace STORAGE-ACCOUNT-KEY with: Key 1 of azstorage123"],
            ]
          },
          { type: "list", items: ["Press Ctrl + S to save."] },
          { type: "banner", variant: "warning", text: "You will have copied the storage account name and Key 1 from the Azure Portal in previous steps." },
        ]
      },

      // ── TASK 3 ──
      { type: "heading", id: "task-3", text: "Task 3: Manage Azure Storage from Eclipse", level: "task" },
      { type: "para", text: "In this task, you will manage Azure Storage from Eclipse using Java. Each step edits Executor.java line 19, saves, and runs the project." },
      {
        type: "step", id: "t3-s1", number: 1, title: "Step 1: Create New Container",
        content: [
          { type: "para", text: "In Executor.java → Line 19, set:" },
          { type: "code", language: "java", code: `createContainer(utility, "demo")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: Container demo is created in the Azure Storage account." },
        ]
      },
      {
        type: "step", id: "t3-s2", number: 2, title: "Step 2: Create New (Second) Container",
        content: [
          { type: "code", language: "java", code: `createContainer(utility, "images")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: Container images is created alongside demo." },
        ]
      },
      {
        type: "step", id: "t3-s3", number: 3, title: "Step 3: List the Containers",
        content: [
          { type: "code", language: "java", code: `listExistingContainers(utilities)` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: Console prints both demo and images containers." },
        ]
      },
      {
        type: "step", id: "t3-s4", number: 4, title: "Step 4: View Containers from Storage Account",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "Azure Portal → Storage accounts → open azstorage123 → Containers (under Manage)" },
          { type: "banner", variant: "success", text: "Result: Both demo and images containers are visible in the portal." },
        ]
      },
      {
        type: "step", id: "t3-s5", number: 5, title: "Step 5: Delete the Container",
        content: [
          { type: "code", language: "java", code: `deleteContainer(utilities, "demo")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: Container demo is deleted." },
        ]
      },
      {
        type: "step", id: "t3-s6", number: 6, title: "Step 6: List Containers Again",
        content: [
          { type: "code", language: "java", code: `listExistingContainers(utilities)` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: Only images container remains. demo is gone." },
        ]
      },
      {
        type: "step", id: "t3-s7", number: 7, title: "Step 7: Upload the Blob",
        content: [
          { type: "code", language: "java", code: `uploadBlob(utilities, "C:/blob-code/Upload/File01.txt", "File01.txt", "images")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: File01.txt is uploaded to the images container." },
        ]
      },
      {
        type: "step", id: "t3-s8", number: 8, title: "Step 8: List the Blobs",
        content: [
          { type: "code", language: "java", code: `listExistingBlobs(utilities, "images")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: Console lists File01.txt inside the images container." },
        ]
      },
      {
        type: "step", id: "t3-s9", number: 9, title: "Step 9: Download the Blob",
        content: [
          { type: "code", language: "java", code: `downloadBlob(utilities, "File01.txt", "images", "C:\\\\blob-code\\\\File01.txt")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: File01.txt is downloaded to C:\\blob-code\\ on the workstation." },
        ]
      },
      {
        type: "step", id: "t3-s10", number: 10, title: "Step 10: Read the Downloaded Blob",
        content: [
          {
            type: "list", items: [
              "Right-click Start → Run → type C:\\ → OK.",
              "Open the blob-code folder.",
              "Open File01.txt in Notepad and verify its contents.",
            ]
          },
        ]
      },
      {
        type: "step", id: "t3-s11", number: 11, title: "Step 11: Read the Blob from Storage Account",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "Azure Portal → Storage accounts → azstorage123 → Containers → open images → open File01.txt" },
          { type: "list", items: ["Copy the URL to Notepad.", "Paste the URL in a local browser to verify access."] },
        ]
      },
      {
        type: "step", id: "t3-s12", number: 12, title: "Step 12: Upload Blob with Metadata",
        content: [
          { type: "code", language: "java", code: `uploadBlobWithMetadata(utilities, "C:/Blob-Code/Upload/File02.txt", "File02.txt", "images")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: File02.txt is uploaded to images with metadata attached." },
        ]
      },
      {
        type: "step", id: "t3-s13", number: 13, title: "Step 13: Update the Blob Metadata",
        content: [
          { type: "code", language: "java", code: `addMetadataToExistingBlob(utilities, "File01.txt", "images")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor."] },
          { type: "banner", variant: "success", text: "Result: Metadata updated for File01.txt." },
        ]
      },
      {
        type: "step", id: "t3-s14", number: 14, title: "Step 14: Create SAS URL",
        content: [
          { type: "code", language: "java", code: `getAccessUrl(utilities, "File02.txt", "images")` },
          { type: "list", items: ["Press Ctrl + S → Execute Run Executor.", "Copy the SAS URL printed in the console to Notepad."] },
          { type: "banner", variant: "tip", text: "A pre-signed (SAS) URL grants time-limited access to a specific blob without exposing the account key." },
        ]
      },
      {
        type: "step", id: "t3-s15", number: 15, title: "Step 15: Access the Object from Browser",
        content: [
          { type: "list", items: ["From your local desktop browser, paste the SAS URL of File02.txt.", "Verify the file content is accessible."] },
          { type: "banner", variant: "success", text: "Result: Browser displays File02.txt content without authentication." },
        ]
      },
      {
        type: "step", id: "t3-s16", number: 16, title: "Step 16: Read the Metadata",
        content: [
          { type: "label", text: "Navigation (Object 1 — File01):" },
          { type: "para", text: "Azure Portal → Storage accounts → azstorage123 → Containers → images → open File01.txt" },
          { type: "list", items: ["Review the metadata; click ✕ to close."] },
          { type: "label", text: "Navigation (Object 2 — File02):" },
          { type: "para", text: "From the images container, open File02.txt." },
          { type: "list", items: ["Review the metadata; click ✕ to close."] },
          { type: "banner", variant: "success", text: "Result: Both blobs display their metadata key-value pairs." },
        ]
      },

      // ── TASK 4 ──
      { type: "heading", id: "task-4", text: "Task 4: Stop the Environment", level: "task" },
      { type: "para", text: "Gracefully shut down the Eclipse project and stop the workstation VM to avoid charges." },
      {
        type: "step", id: "t4-s1", number: 1, title: "Step 1: Close the Maven Project",
        content: [
          {
            type: "list", items: [
              "In Eclipse, select the azurestglab project.",
              "Click Project → Close Project.",
              "Click File → Exit to close Eclipse.",
            ]
          },
        ]
      },
      {
        type: "step", id: "t4-s2", number: 2, title: "Step 2: Stop the Workstation",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "Azure Portal → Virtual machines → open dev-ec-ws" },
          { type: "list", items: ["Click Stop.", "Confirm by clicking Yes."] },
          { type: "banner", variant: "success", text: 'Result: VM status changes to "Stopped (deallocated)". No compute charges incurred.' },
        ]
      },
      { type: "congrats", labCode: "LAB-204-02-01", summary: "You created a VM workstation, installed Java and Eclipse, connected to Azure Storage, and performed full blob lifecycle management including upload, download, metadata, and SAS URLs — all programmatically from Java." },
    ],
  },

  /* ════════════════════════════════════════════════════════════
     LAB 3 — Google Cloud Platform Fundamentals
  ════════════════════════════════════════════════════════════ */
  "3": {
    meta: {
      title: "Google Cloud Platform Fundamentals",
      code: "LAB-301-01-01",
      version: "v1.3",
      duration: "4 hours",
      credits: "6 Credits",
      level: "Beginner",
      rating: 4.7,
      platform: "GCP",
      isFree: true,
      timerSec: 14400,
    },
    setupNotes: [
      "Use an Incognito / private browser window.",
      "Use the provided Google Cloud credentials only.",
      "Do not create personal GCP projects.",
      "All resources are pre-provisioned in the lab project.",
    ],
    toc: [
      { id: "lab-overview", label: "Lab Overview", indent: 0 },
      { id: "objectives", label: "Objectives", indent: 0 },
      { id: "task-1", label: "Task 1: Compute Engine", indent: 0, isTask: true },
      { id: "t1-s1", label: "Step 1: Create VM Instance", indent: 1 },
      { id: "t1-s2", label: "Step 2: SSH into VM", indent: 1 },
      { id: "task-2", label: "Task 2: Cloud Storage", indent: 0, isTask: true },
      { id: "t2-s1", label: "Step 1: Create GCS Bucket", indent: 1 },
      { id: "t2-s2", label: "Step 2: Upload Objects", indent: 1 },
      { id: "task-3", label: "Task 3: BigQuery", indent: 0, isTask: true },
      { id: "t3-s1", label: "Step 1: Create Dataset", indent: 1 },
      { id: "t3-s2", label: "Step 2: Run SQL Query", indent: 1 },
      { id: "congratulations", label: "Congratulations!", indent: 0 },
    ],
    sections: [
      { type: "heading", id: "lab-overview", text: "Overview", level: "h2" },
      { type: "para", text: "Master the basics of Google Cloud Platform including Compute Engine for virtual machines, Cloud Storage for object storage, and BigQuery for analytics." },
      { type: "media", src: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800", mediaType: "image", caption: "Google Cloud Platform — Core Services", alt: "GCP" },
      { type: "heading", id: "objectives", text: "Objectives", level: "h2" },
      {
        type: "list", items: [
          "Create and manage Compute Engine VM instances",
          "SSH into VMs and run basic Linux commands",
          "Create Cloud Storage buckets and upload objects",
          "Set bucket-level IAM policies",
          "Create BigQuery datasets and tables",
          "Run SQL queries on public datasets",
        ]
      },
      { type: "heading", id: "task-1", text: "Task 1: Compute Engine", level: "task" },
      {
        type: "step", id: "t1-s1", number: 1, title: "Step 1: Create VM Instance",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "GCP Console → Compute Engine → VM instances → Create Instance" },
          {
            type: "table", rows: [
              ["Name", "lab-vm-01"],
              ["Region", "us-central1"],
              ["Zone", "us-central1-a"],
              ["Machine type", "e2-micro"],
              ["Boot disk", "Debian GNU/Linux 11"],
              ["Firewall", "Allow HTTP traffic"],
            ]
          },
          { type: "list", items: ["Click Create."] },
          { type: "banner", variant: "success", text: "Result: VM lab-vm-01 appears with a green checkmark and an External IP assigned." },
        ]
      },
      {
        type: "step", id: "t1-s2", number: 2, title: "Step 2: SSH into VM",
        content: [
          { type: "list", items: ["Click SSH button next to lab-vm-01.", "A browser SSH window opens."] },
          { type: "code", language: "bash", code: "uname -a\ndf -h\nfree -h" },
          { type: "banner", variant: "success", text: "Result: Linux kernel info, disk usage, and memory stats are displayed." },
        ]
      },
      { type: "heading", id: "task-2", text: "Task 2: Cloud Storage", level: "task" },
      {
        type: "step", id: "t2-s1", number: 1, title: "Step 1: Create GCS Bucket",
        content: [
          { type: "code", language: "bash", code: `gsutil mb -l US-CENTRAL1 gs://lab-bucket-$(date +%s)/` },
          { type: "banner", variant: "success", text: "Result: Bucket created successfully." },
        ]
      },
      {
        type: "step", id: "t2-s2", number: 2, title: "Step 2: Upload Objects",
        content: [
          {
            type: "code", language: "bash", code: `echo "Hello GCP" > test.txt
gsutil cp test.txt gs://lab-bucket-YOUR_BUCKET_ID/
gsutil ls gs://lab-bucket-YOUR_BUCKET_ID/` },
          { type: "banner", variant: "success", text: "Result: test.txt appears in the bucket listing." },
        ]
      },
      { type: "heading", id: "task-3", text: "Task 3: BigQuery", level: "task" },
      {
        type: "step", id: "t3-s1", number: 1, title: "Step 1: Create Dataset",
        content: [
          { type: "label", text: "Navigation:" },
          { type: "para", text: "GCP Console → BigQuery → your project → Create dataset" },
          { type: "table", rows: [["Dataset ID", "lab_dataset"], ["Location", "US"]] },
          { type: "list", items: ["Click Create dataset."] },
        ]
      },
      {
        type: "step", id: "t3-s2", number: 2, title: "Step 2: Run SQL Query",
        content: [
          {
            type: "code", language: "sql", code: `SELECT
  name,
  SUM(number) AS total
FROM
  bigquery-public-data.usa_names.usa_1910_2013
WHERE
  state = 'TX'
GROUP BY
  name
ORDER BY
  total DESC
LIMIT 10;` },
          { type: "banner", variant: "success", text: "Result: Top 10 names in Texas returned with their total counts." },
        ]
      },
      { type: "congrats", labCode: "LAB-301-01-01", summary: "You explored GCP's three core services: created a Compute Engine VM, stored objects in Cloud Storage, and ran analytics queries in BigQuery." },
    ],
  },

  /* ════════════════════════════════════════════════════════════
     LAB 7 — Docker Container Essentials
  ════════════════════════════════════════════════════════════ */
  "7": {
    meta: {
      title: "Docker Container Essentials",
      code: "LAB-401-01-01",
      version: "v2.0",
      duration: "2.5 hours",
      credits: "5 Credits",
      level: "Beginner",
      rating: 4.7,
      platform: "DevOps",
      isFree: true,
      timerSec: 9000,
    },
    setupNotes: [
      "Docker Desktop must be running on your local machine.",
      "Alternatively, use the provided Linux VM.",
      "Ensure ports 8080 and 3000 are free.",
    ],
    toc: [
      { id: "lab-overview", label: "Lab Overview", indent: 0 },
      { id: "objectives", label: "Objectives", indent: 0 },
      { id: "task-1", label: "Task 1: Docker Basics", indent: 0, isTask: true },
      { id: "t1-s1", label: "Step 1: Pull & Run Image", indent: 1 },
      { id: "t1-s2", label: "Step 2: Inspect Container", indent: 1 },
      { id: "task-2", label: "Task 2: Build Custom Image", indent: 0, isTask: true },
      { id: "t2-s1", label: "Step 1: Write Dockerfile", indent: 1 },
      { id: "t2-s2", label: "Step 2: Build & Run", indent: 1 },
      { id: "task-3", label: "Task 3: Docker Compose", indent: 0, isTask: true },
      { id: "t3-s1", label: "Step 1: Write compose.yaml", indent: 1 },
      { id: "t3-s2", label: "Step 2: Launch Stack", indent: 1 },
      { id: "congratulations", label: "Congratulations!", indent: 0 },
    ],
    sections: [
      { type: "heading", id: "lab-overview", text: "Overview", level: "h2" },
      { type: "para", text: "Master containerization from scratch — pulling images, running containers, building custom images with Dockerfiles, and orchestrating multi-container applications with Docker Compose." },
      { type: "media", src: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800", mediaType: "image", caption: "Docker Container Essentials", alt: "Docker" },
      { type: "heading", id: "objectives", text: "Objectives", level: "h2" },
      {
        type: "list", items: [
          "Pull images from Docker Hub",
          "Run, stop, and remove containers",
          "Inspect running containers and view logs",
          "Write a Dockerfile and build a custom image",
          "Push an image to Docker Hub",
          "Orchestrate multi-container apps with Docker Compose",
        ]
      },
      { type: "heading", id: "task-1", text: "Task 1: Docker Basics", level: "task" },
      {
        type: "step", id: "t1-s1", number: 1, title: "Step 1: Pull & Run Image",
        content: [
          { type: "code", language: "bash", code: "docker pull nginx:latest\ndocker run -d -p 8080:80 --name my-nginx nginx:latest\ncurl http://localhost:8080" },
          { type: "banner", variant: "success", text: "Result: nginx welcome page HTML is returned." },
        ]
      },
      {
        type: "step", id: "t1-s2", number: 2, title: "Step 2: Inspect Container",
        content: [
          { type: "code", language: "bash", code: "docker ps\ndocker inspect my-nginx\ndocker logs my-nginx\ndocker stop my-nginx && docker rm my-nginx" },
        ]
      },
      { type: "heading", id: "task-2", text: "Task 2: Build Custom Image", level: "task" },
      {
        type: "step", id: "t2-s1", number: 1, title: "Step 1: Write Dockerfile",
        content: [
          {
            type: "code", language: "dockerfile", code: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]` },
        ]
      },
      {
        type: "step", id: "t2-s2", number: 2, title: "Step 2: Build & Run",
        content: [
          { type: "code", language: "bash", code: "docker build -t my-node-app:v1 .\ndocker run -d -p 3000:3000 my-node-app:v1\ncurl http://localhost:3000" },
          { type: "banner", variant: "success", text: "Result: Custom Node.js app responds on port 3000." },
        ]
      },
      { type: "heading", id: "task-3", text: "Task 3: Docker Compose", level: "task" },
      {
        type: "step", id: "t3-s1", number: 1, title: "Step 1: Write compose.yaml",
        content: [
          {
            type: "code", language: "yaml", code: `services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      - DB_HOST=db
  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=secret
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:` },
        ]
      },
      {
        type: "step", id: "t3-s2", number: 2, title: "Step 2: Launch Stack",
        content: [
          { type: "code", language: "bash", code: "docker compose up -d\ndocker compose ps\ndocker compose logs -f" },
          { type: "banner", variant: "success", text: "Result: Both app and db containers are running. App connects to Postgres." },
        ]
      },
      { type: "congrats", labCode: "LAB-401-01-01", summary: "You mastered Docker fundamentals: pulled images, ran containers, built a custom Dockerfile, and orchestrated a multi-container stack with Docker Compose." },
    ],
  },
};

/** Helper — get lab by ID with fallback */
export function getLabById(id) {
  return LABS[id] || null;
}