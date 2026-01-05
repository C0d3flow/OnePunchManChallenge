import type PocketBase from 'pocketbase';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
		  pd: PocketBase;
		  user: any;
                }
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
