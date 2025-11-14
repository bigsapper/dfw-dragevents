# Tools - Backend CLI

Go-based CLI for database management and event operations.

## Quick Commands

### Event Management
```powershell
make event-add                        # Add single event interactively
make event-list                       # List all events
make event-delete ID=5                # Delete event by ID
make event-import FILE=events.csv     # Bulk import from CSV
```

### Database
```powershell
make init                             # Initialize database
make seed                             # Add sample data
make export                           # Export to JSON
```

### Testing & Build
```powershell
make test                             # Run tests
make build                            # Build CLI executable
make help                             # Show all commands
```

## CSV Template

Use `examples/events_template.csv` as a starting point for bulk imports.

## Documentation

- **[Event Management Guide](../docs/EVENT_MANAGEMENT.md)** - Complete guide for adding/managing events
- **[Main README](../README.md)** - Full project documentation
- **[AWS Deployment](../docs/AWS_DEPLOYMENT.md)** - Deployment instructions

## Workflow

1. Add/edit events (CSV or interactive CLI)
2. `make export` - Generate JSON
3. Test locally in `../site/`
4. Deploy via `aws/deploy.ps1`
