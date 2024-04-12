# devlog

Notes taken durring development, newest to oldest

## TODO:

**This branch: Integrate Notion as persistant storage layer**

- [ ] Mutation to remove a link

## [[2024-04-11 thu]]

This is my first entry into the devlog. I have been very focused building out the frontend for this project, and have until today not needed to add any additional functionality to this API. The first new feature will be the ability to remove a link.

Adding in the deleteLink mutation has been fairly straight forward. This has been a good opportunity to get more familiar with the Notion JS client, and I have to admit the fact that it is fully typed is super helpful. TS for the win! I am able to easily bubble the Notion API errors back to the client, which is ideal at this state in the project.
