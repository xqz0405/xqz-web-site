import { execSync } from 'node:child_process'

function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim()
}

console.log('Updating submodule...')
run('git submodule update --remote xqz-web')

const changed = run('git diff --name-only xqz-web')
if (!changed) {
  console.log('No new commits in submodule, nothing to do.')
  process.exit(0)
}

console.log('New commits detected, committing and pushing...')
run('git add xqz-web')
run('git commit -m "chore: update submodule xqz-web"')
run('git push')

console.log('Done! CI/CD will rebuild and deploy.')
