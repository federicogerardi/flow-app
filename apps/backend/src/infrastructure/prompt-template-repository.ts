import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, symlinkSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { PromptVersion } from '@flow-app/domain';
import type { PromptTemplateId, PromptTemplateContent, PromptTemplateRepository } from '@flow-app/domain';

export class FilesystemPromptTemplateRepository implements PromptTemplateRepository {
  constructor(private readonly basePath: string) {}

  async findById(
    templateId: PromptTemplateId,
    version?: PromptVersion,
  ): Promise<PromptTemplateContent | null> {
    const resolvedVersion = version ?? PromptVersion.LATEST;
    const versionPath = this.resolveVersionPath(templateId, resolvedVersion);

    if (!existsSync(versionPath)) return null;

    const systemPath = join(versionPath, 'system.md');
    const userPath = join(versionPath, 'user.md');

    if (!existsSync(systemPath) || !existsSync(userPath)) return null;

    return {
      system: readFileSync(systemPath, 'utf-8').trim(),
      user: readFileSync(userPath, 'utf-8').trim(),
    };
  }

  async publishVersion(
    templateId: PromptTemplateId,
    version: PromptVersion,
    content: PromptTemplateContent,
  ): Promise<void> {
    const templateDir = this.getTemplateDir(templateId);
    const versionDir = join(templateDir, 'versions', version.value);

    mkdirSync(versionDir, { recursive: true });
    writeFileSync(join(versionDir, 'system.md'), content.system, 'utf-8');
    writeFileSync(join(versionDir, 'user.md'), content.user, 'utf-8');

    // Update latest symlink
    const latestLink = join(templateDir, 'versions', 'latest');
    try {
      if (existsSync(latestLink)) unlinkSync(latestLink);
    } catch {
      // Ignore on systems that don't support unlink on symlinks
    }
    try {
      symlinkSync(version.value, latestLink);
    } catch {
      // Symlink creation may fail on some systems, ignore
    }
  }

  async listVersions(templateId: PromptTemplateId): Promise<PromptVersion[]> {
    const versionsDir = join(this.getTemplateDir(templateId), 'versions');
    if (!existsSync(versionsDir)) return [];

    return readdirSync(versionsDir)
      .filter((entry) => entry !== 'latest' && /^\d+\.\d+\.\d+$/.test(entry))
      .map((v) => PromptVersion.from(v))
      .sort((a, b) => {
        const [a1, a2, a3] = a.value.split('.').map(Number);
        const [b1, b2, b3] = b.value.split('.').map(Number);
        return (b1 - a1) || (b2 - a2) || (b3 - a3);
      });
  }

  private getTemplateDir(templateId: PromptTemplateId): string {
    return join(this.basePath, templateId.toolKey, templateId.stepLabel);
  }

  private resolveVersionPath(templateId: PromptTemplateId, version: PromptVersion): string {
    const templateDir = this.getTemplateDir(templateId);
    if (version.isLatest) {
      return join(templateDir, 'versions', 'latest');
    }
    return join(templateDir, 'versions', version.value);
  }
}
