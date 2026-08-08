# Contributing

Run `npm run check` and build every changed template image before opening a pull request. A template
version directory is immutable after release; create a new version for behavioral changes.

New dependencies require a short review in the pull request covering maintenance activity,
licensing, adoption, necessity and security posture. GitHub Actions must use full commit SHAs with a
human-readable version comment. Do not add renderer hooks or executable code that HodosGraph would
run while instantiating a repository.
