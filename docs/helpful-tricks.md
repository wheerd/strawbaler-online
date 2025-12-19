To add an import to every file that does not have it yet:

find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec grep -L '@/shared/geometry' {} + \
  | xargs sed -i '' '1i\import { ... } from "@/shared/geometry"'

  Afterwards, clean it up with pnpm lint:fix - eslint removes unused imports