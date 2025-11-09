# Creating the AWS Architecture Diagram

## Option 1: Using draw.io (Recommended)

1. Go to https://app.diagrams.net/
2. Create a new diagram
3. Click **More Shapes** → Enable **AWS 19** (AWS Architecture Icons)
4. Add the following components:

### Components to Add:

**Networking & Content Delivery:**
- Route 53 (DNS)
- CloudFront (CDN)

**Storage:**
- S3 (Simple Storage Service) - 2 instances

**Management & Governance:**
- GitHub (use General → Internet icon or custom)

### Layout:

```
User (General → User icon)
    ↓
Route 53 (Networking → Route 53)
    ↓
CloudFront (Networking → CloudFront)
    ↓
Origin Group (use a container/group)
    ├─ S3 Bucket (Storage → S3) - us-east-1
    └─ S3 Bucket (Storage → S3) - us-west-2
    
GitHub (off to the side with arrow to S3)
```

### Steps:

1. Drag icons from AWS 19 library
2. Connect with arrows
3. Add labels for regions and status
4. Export as PNG or SVG
5. Save to `docs/images/aws-architecture.png`

## Option 2: Use AWS Architecture Icons Directly

Download the official AWS Architecture Icons:
- https://aws.amazon.com/architecture/icons/

Then create diagram in:
- PowerPoint
- Visio
- Lucidchart
- draw.io

## Option 3: Use Mermaid Diagram (GitHub Native)

GitHub supports Mermaid diagrams natively in markdown. Here's a simplified version:

\`\`\`mermaid
graph TD
    User[User Request] --> Route53[Route 53<br/>DNS Service<br/>Global]
    Route53 --> CloudFront[CloudFront CDN<br/>Global Edge Locations<br/>HTTPS/SSL]
    CloudFront --> OriginGroup[Origin Group<br/>Automatic Failover]
    OriginGroup --> S3Primary[S3 Bucket<br/>dfw-dragevents.com<br/>us-east-1<br/>✓ Primary]
    OriginGroup -.Failover.-> S3Secondary[S3 Bucket<br/>dfw-dragevents-backup<br/>us-west-2<br/>⏸ Standby]
    GitHub[GitHub Repository<br/>Source Control] -.deploy.ps1.-> S3Primary
    GitHub -.deploy.ps1.-> S3Secondary
    
    style Route53 fill:#8C4FFF,stroke:#8C4FFF,color:#fff
    style CloudFront fill:#FF9900,stroke:#FF9900,color:#fff
    style S3Primary fill:#3F8624,stroke:#3F8624,color:#fff
    style S3Secondary fill:#3F8624,stroke:#3F8624,color:#fff
    style OriginGroup fill:#E7F6EC,stroke:#1D8102
    style GitHub fill:#24292e,stroke:#24292e,color:#fff
\`\`\`

## Recommended Approach

For professional AWS architecture diagrams with official icons:

1. Use **draw.io** with AWS Architecture Icons library
2. Export as PNG (for best compatibility)
3. Save to `docs/images/aws-architecture.png`
4. Reference in markdown: `![AWS Architecture](images/aws-architecture.png)`

This ensures:
- Official AWS icon styling
- Professional appearance
- Easy to update
- GitHub-friendly format
