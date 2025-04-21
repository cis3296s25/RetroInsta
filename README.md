<img src="front-end/public/insta.png" alt="RetroInsta Preview" width="200">

# RetroInsta - A Day One Instagram Clone

RetroInsta aims to replicate Instagram's initial feature set. Users can log in with their Google Accounts, post a photo with a filter applied, like other user's posts, follow other accounts, see a feed of posts from accounts they follow, and see an explore page which features popular posts site-wide.

## Vision Statement
For individuals who want to share and view photos, RetroInsta is a social media application that focuses solely on pictures, providing a more personal and connected experience. Unlike other social media platforms that are cluttered with advertisements and can feel impersonal, our platform offers a simpler, ad-free experience centered around authentic photo sharing.

## How to build and run
Link to our Trello project board [here](https://trello.com/b/E8lh6y8I/retroinsta).
- Install Docker. The easiest way is to install [Docker Desktop](https://docs.docker.com/desktop/).
- Clone this repo.
- Copy `.env-example` to a new file called `.env` or run this command in the project's root directory (`RetroInsta` by default): `cp .env-example .env`.
- Edit the new `.env` file based on the instructions in the comments.
- Open Docker Desktop to ensure the Docker daemon/engine is running or do so [manually](https://docs.docker.com/engine/daemon/start/).
- Run the following command from the project's root directory (`RetroInsta` by default) to build the Docker images and start them in containers: `docker compose up` (if you make changes after running this, add the `--build` flag to rebuild the images).
- Go to http://localhost:5173 to view the website.
- Use <kbd>Ctrl</kbd> + <kbd>C</kbd> or run `docker compose down` to stop running the containers.

## How to contribute
Fork this project and make a pull request.
