# Deployment Guide

This document covers how to build, verify, and deploy the OpenSource Mentor pod application to a production Lemma stack.

## Pod Bundle Export
To compile the pod bundle into a deployable ZIP archive:
```bash
lemma pod bundle C:\Projects\opensource-mentor --output C:\Projects\opensource-mentor-pod.zip
```

## Production Import
Upload the bundle to your Lemma instance via CLI:
```bash
lemma pod import C:\Projects\opensource-mentor-pod.zip --org <your-org-uuid>
```

## App Deployment
Deploy the frontend operator app to the Lemma container network:
```bash
cd C:\Projects\opensource-mentor\apps\frontend\source
lemma apps deploy
```

This registers your public operators endpoint and serves the React SaaS dashboard.
