# 🚀 Launch Day Quick Reference

**Keep this handy during deployment!**

---

## ⚡ Pre-Flight Checklist (5 minutes)

```bash
# 1. Run all tests
npm run test:run && echo "✅ Unit tests passed!"

# 2. Run E2E tests (optional - takes 5-10 min)
npm run test:e2e && echo "✅ E2E tests passed!"

# 3. Build production bundle
npm run build && echo "✅ Build successful!"

# 4. Check bundle sizes
ls -lh dist/assets/*.js | tail -5

# 5. Test production build locally
npm run preview
# Open http://localhost:4173 and verify it works
```

**All passing? ✅ Ready to deploy!**

---

## 🚢 Deployment Commands

### **Option 1: Vercel (Recommended)**
```bash
# Install Vercel CLI (if not already)
npm i -g vercel

# Deploy to production
vercel --prod

# Follow prompts, then get URL
```

### **Option 2: Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy to production
netlify deploy --prod --dir=dist

# Follow prompts
```

### **Option 3: GitHub Actions (Auto)**
```bash
# Just push to main
git push origin main

# GitHub Actions will auto-deploy
# Check: https://github.com/your-org/coding-ui/actions
```

---

## 🧪 Smoke Tests (Post-Deploy)

**Run these immediately after deployment:**

### **1. Basic Functionality (2 minutes):**
- [ ] Site loads: https://your-app.com
- [ ] Homepage displays categories
- [ ] Can click into a category
- [ ] Can add new category
- [ ] Can add new code
- [ ] Dark mode toggle works
- [ ] No console errors

### **2. Critical Workflows (5 minutes):**
- [ ] Add category → Success
- [ ] Add code → Success
- [ ] Categorize answer → Success
- [ ] Search/filter → Works
- [ ] Bulk actions → Work
- [ ] Delete with confirmation → Works

### **3. Mobile Check (2 minutes):**
- [ ] Open on phone (or DevTools mobile view)
- [ ] Touch targets tappable
- [ ] No horizontal scrolling
- [ ] Modals work on mobile

**All passing? ✅ Deployment successful!**

---

## 📊 Monitoring Dashboards

**Check these during and after launch:**

- **Hosting:** 
  - Vercel: https://vercel.com/dashboard
  - Netlify: https://app.netlify.com/
- **Database:** Supabase Dashboard
- **Errors:** Browser console (F12)
- **Performance:** Browser DevTools Performance tab

---

## 🚨 Emergency Rollback

**If something goes wrong:**

### **Via Hosting Platform (Fastest):**

**Vercel:**
1. Go to https://vercel.com/your-project
2. Click "Deployments"
3. Find previous working deployment
4. Click "..." → "Promote to Production"

**Netlify:**
1. Go to https://app.netlify.com/sites/your-site/deploys
2. Find previous working deployment
3. Click "Publish deploy"

### **Via Git:**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Wait for auto-deploy (if GitHub Actions)
# Or manually deploy again
```

**Estimated rollback time:** 2-5 minutes

---

## 📈 Key Metrics to Watch

**First Hour (Critical!):**
- **Error rate:** Should be < 1%
- **Page load time:** Should be < 3s
- **Users active:** Monitor for anomalies
- **Console errors:** Should be none

**First Day:**
- **Uptime:** Should be 99.9%+
- **User satisfaction:** Positive feedback
- **Bug reports:** Address critical ones immediately

---

## 🆘 If Something Goes Wrong

### **Step 1: DON'T PANIC 🧘**

### **Step 2: Assess Severity**

**Critical (Rollback immediately):**
- Site down (500 errors)
- Data corruption
- Security breach
- Users can't login

**High (Fix within 1 hour):**
- Feature broken
- Performance degraded
- Errors for some users

**Medium (Fix within 1 day):**
- Minor bug
- UX issue
- Non-critical feature

### **Step 3: Take Action**

**If Critical:**
```bash
# ROLLBACK NOW!
# Use hosting platform rollback (fastest)
# Notify team immediately
```

**If High:**
```bash
# Create hotfix branch
git checkout -b hotfix/critical-issue

# Fix issue
# Test locally
# Deploy fix
```

**If Medium:**
- Create issue in GitHub
- Plan fix for next release
- Document workaround

### **Step 4: Communicate**
- Notify team (Slack/Email)
- Update status page (if you have one)
- Inform affected users (if applicable)

---

## ✅ Success Indicators

**You're good if you see:**

✅ Zero 500 errors in first hour  
✅ Response time < 500ms  
✅ All smoke tests pass  
✅ No rollback needed  
✅ Positive user feedback  
✅ Error rate < 1%  

---

## 📞 Emergency Contacts

**Dev Team:**
- Developer on-call: _______________
- Tech lead: _______________
- Manager: _______________

**External:**
- Hosting support: _______________
- Database support: _______________

---

## 🎯 Quick Commands Reference

```bash
# Check if site is up
curl -I https://your-app.com

# Check build status
npm run build

# Run all tests
npm run test:all

# Check for errors
npm run lint

# Local preview
npm run preview
```

---

## 🎉 Post-Launch Celebration Checklist

Once everything is stable (after 24 hours):

- [ ] Take a screenshot of production site
- [ ] Thank the team
- [ ] Write launch announcement
- [ ] Update LinkedIn/social media
- [ ] Plan celebration (pizza? 🍕)
- [ ] Start planning v1.1 features

---

**Good luck with your launch! 🚀**

**You've got this! The app is ready!** 💪

