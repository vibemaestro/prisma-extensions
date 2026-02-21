# Contributing

## Code

Our code is our treasure, please take care of it. You can make it better by following this simple process:

1. Make it work and Test it
2. Then make it beautiful
3. Then make it performant

## Branches

### main

Main is our main branch. This is where all our code ends when it has been **developed**, **tested**, **reviewed** and **approved**.

We aim to keep a linear history in a nice and readable way. Example :

- ...etc
- build: change version config for v1.2.0
- bug: fix 404 issue with auth api. Refs #AV-1111
- feat: add raw query helper. Refs #AV-1112
- feat: as a developer I want to have an example project with performance testing. Refs #AV-1113

Please **don't do**:

- Merge commits
- Commit messages that doesn't match our format
- Multiple commits into one PR
- Use [misc] commits for everything we should have stories for almost everything

Please **always do**:

- Clear small and readable commit messages
- Rebase and FF your PR's
- One commit per PR

### develop

This is our developing branch. It will be the latest code with all features

### feature/\*

These branches are were we develop our features. They serve as a basis for our PRs. They are run through our CI pipelines for code quality checks and security checks.

### bug/\*

These branches are were we develop our bug fixes. They serve as a basis for our PRs. They are run through our CI pipelines for code quality checks and security checks.

### release/\*

Releases are prepared on release branches. They serve as a basis for deploying our releases to our environments.

## Tests

We test our code through unit tests and integration tests.

We aim for at least 60% coverage.

## Pull-Requests

We never merge anything without a PR except for automated tasks such as releasing.

When you create a Pull-Request please **review it yourself** asap. When you have reviewed it you can **ask for review from others** in the slack channel.

### Pull-Requests Review

When we review a pull request we should always do the following process:

1. Checkout the PR branch
2. Compile the code
3. Run the tests
4. Check that it works functionnally speaking
   - It means reading the functional specifications before testing
   - Please also try edge cases
5. Check the code and code style
6. Check the performance
7. If you don't find anything, please ask yourself: **Did I do a proper review?**

### Pull-Requests Merging

We want to keep a nice and linear history thus we have a very simple but strict workflow for merging PR's:

1. We only **rebase and fast forward** a PR
2. The commit message respects our rules
   - Only 1 commit per PR
   - Commit message takes this form:
     - For features: `feat: my feature description. Refs #AV-1111`
     - For bug fixes: `bug: my bug fix description. Refs #AV-1112`
     - For releases: `build: change version config for v1.2.0`
     - For other stuff (should be a rare exception): `misc: add build pipeline to the repos`
3. If you have multiple commits in your branch please follow this process to have a single pretty commit after review:

   ```bash
       # On your branch f.ex feature/av-xxx-my-feature
       # while you work on your branch you can create as many commit as you like
       # When your branch is READY and REVIEWED and Before your merge to MAIN please do the following:
       git checkout main
       git pull # update main to latest
       git checkout feature/av-xxx-my-feature # go back on your branch
       git merge main # merge main (it will eventually create a merge commit but we don't care we are going to suppress it)
       git reset --soft origin/main # reset your branch history to main
       git commit -m "feat: my nice and ONLY ONE commit message. Refs #AV-XXX"
       git push --force # You need to force push (this is only allowed to your own branches)
       # NOW you are ready to merge with Rebase and fast forward strategy
   ```

4. Now you can merge
