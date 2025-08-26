import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isUpToDate: boolean;
}

/**
 * Check for package updates by comparing current version with npm registry
 */
export async function checkForUpdates(packageName: string, currentVersion: string): Promise<UpdateInfo> {
  try {
    // Use npm view to get the latest version from registry
    const { stdout } = await execAsync(`npm view ${packageName} version`);
    const latestVersion = stdout.trim();
    
    const isUpToDate = currentVersion === latestVersion;
    
    return {
      currentVersion,
      latestVersion,
      isUpToDate
    };
  } catch (error) {
    // If npm command fails, assume we're up to date to avoid breaking the tool
    return {
      currentVersion,
      latestVersion: currentVersion,
      isUpToDate: true
    };
  }
}