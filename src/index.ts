import { Auto, execPromise, IPlugin, IExtendedCommit } from "@auto-it/core";
import { promisify } from "util";
import * as t from "io-ts";
import { IDeveloper, parse } from "pom-parser";

//import { inc, ReleaseType } from "semver";
//import * as jsdom from "jsdom";

const snapshotSuffix = "-SNAPSHOT";

/** Parse the pom.xml file **/
const parsePom = promisify(parse);

/** Get the maven pom.xml for a project **/
export const getPom = async (filePath = "pom.xml") =>
	parsePom({ filePath: filePath });

const fileOptions = t.partial({
	/** The relative path of the file */
	path: t.string,
	
	/** Use regex to replace variables inside the file */
	unsafeReplace: t.boolean,
});

const pluginOptions = t.partial({
	/** File that should be updated */
	updateFiles: t.array(fileOptions),
});

export type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;

export interface IAutoBumperProperties {
	version?: string;
}

export default class AutoBumperPlugin implements IPlugin {
	readonly name = "autobumper";
	private readonly options: Required<IAutoBumperPluginOptions>;
	private properties: IAutoBumperProperties = {};

	/** Initialize the plugin with its options **/
	constructor(options: IAutoBumperPluginOptions = {}) {
		this.options = {
			updateFiles: options?.updateFiles,
		};
	}

	/** Get the properties from the pom.xml file **/
	private static async getProperties(): Promise<IAutoBumperProperties> {
		const pom = await getPom();

		return {
			version: pom.pomObject?.project.version,
		};
	}

	apply(auto: Auto) {
		auto.hooks.version.tapPromise(
			this.name,
			async ({ bump, dryRun, quiet }) => {
				const currentVersion = await this.getVersion(auto);
				
				// Go though files and update version numbers

				/*
				await execPromise("git", [
					"tag",
					newVersion,
					"-m",
					`"Update version to ${newVersion}"`,
				]);
				*/
			}
		);
	}

	/** Get the current maven version from pom.xml */
	private async getVersion(auto: Auto): Promise<string> {
		this.properties = await AutoBumperPlugin.getProperties();

		const { version } = this.properties;
		if(version) {
			auto.logger.verbose.info(`Found version in pom.xml: ${version}`);
			return version.replace(snapshotSuffix, "");
		}

		return "0.0.0";
	}
}
