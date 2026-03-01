This is a big, important work. So the connection to dynamodb, s3 bucket, cognito seems to be working fine.    
Next step is to synchronize frontend with AWS backend.

# Features
1. Sync
- When logged in, 작품 목록, 에피소드, 플롯, 소설, ... everything must be fetched and showed on frontend app.
- So no more local indexed db. Scan and review code. And if something is working with local db, it must be changed to 'communicate and sync with AWS backend'.

## New feat to support Sync
- Add 'Save' button to frontend
- When clicked, it saves current changes to backend
- Only save to backend when the save button is clicked. No other circumstances.
- Why? Because real-time saving is expensive, and I don't want to be charged expensive money. To reduce transacations and communcations
- If a user try to exit the service without saving, pop-up an warning window (Save before leaving? kinda)

### Checklist
- [ ] when add 작품, must be added to backend
- [ ] when add 에피소드, must be added to backend
- [ ] when add 플롯, must be added to backend
- [ ] when add 챕터, must be added to backend
- [ ] when delete * (작품, 에피소드, 플롯, 챕터), must be applied to backend as well
- [ ] when add 등장인물, must be added to backend
- [ ] when user clicks save button in 등장인물 상세, must be added to backend (관계, properties, memo, picture, etc.)
- [ ] when user clicks save button in 관계도, must be added to backend

- Use **aws-cost-optimizer** agent to improve a structure to reduce aws cost.
- Number one rule is to minimize the number of transactions between AWS backend. SAVE MY BILL