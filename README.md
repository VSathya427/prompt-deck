
# 📊 PromptDeck  
_Automated AI-Powered Presentation Generator_

## 🚀 Overview
**PromptDeck** is a framework that auto-generates beautiful HTML presentations from structured prompts.  
It leverages **Impress.js** for transitions and **Next.js** for serving interactive decks, while enforcing accessibility and design constraints to ensure professional, readable slides every time.

The goal: **turn prompts into production-ready slide decks** with minimal manual effort.

---

## ✨ Features Implemented (so far)

- 🔹 **Automated Deck Creation**
  - Converts structured prompts into fully themed HTML slides.  
  - Each deck enforces a consistent theme, font, and style.

- 🔹 **Impress.js Integration**
  - Adds smooth 3D transitions and navigation controls.  
  - User flow: deck only advances after pressing `Enter` (no auto-redirects).  

- 🔹 **Next.js Component Orchestration**
  - Sandboxes AI-generated decks into cohesive Next.js components.  
  - Prevents slide overlays and layout bugs by enforcing clean DOM structure.

- 🔹 **Accessibility & Readability Fixes**
  - Ensures text never renders white-on-white.  
  - Normalizes bullet-point formatting (no redundant numbered lists).  

- 🔹 **Task-Summary Prompting**
  - Each generation run ends with a clean `<task_summary>` describing what was created.  
  - Designed for future pipeline automation & auditing.

---

## 📌 Current Progress
✅ Fixed initial landing page (legibility & no auto-redirects)  
✅ Prevented overlay bug between multiple decks  
✅ Standardized bullet formatting across slides  
✅ Added structured `<task_summary>` to enforce completion compliance  

---

## 🔮 Next Steps

- [ ] Build interactive Messages UI & Project Header to enable real-time collaboration and contextual navigation across projects.
- [ ] Implement advanced views (Fragment & Code View) for inspecting AI-generated content and editing output inline.
- [ ] Develop Home Page & customizable Themes for better UX, branding consistency, and streamlined user onboarding.
- [ ] Integrate Authentication & Billing modules to support secure access control and subscription-based usage.


