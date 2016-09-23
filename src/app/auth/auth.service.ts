import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions, Response } from '@angular/http';
import { Router } from '@angular/router';
import { Observable } from "rxjs";

import { apiHost } from '../constants';

@Injectable()
export class AuthService {

    private LOCALSTORAGE_TOKEN_KEY: string = 'auth.api.token';
    private LOCALSTORAGE_USERNAME_KEY: string = 'auth.api.username';

    // TODO: Inject a window or localStorage service here to abstract implicit
    //       dependency on window
    constructor(protected http: Http, protected router: Router) {}

    getToken(): string {
        return window.localStorage.getItem(this.LOCALSTORAGE_TOKEN_KEY) || null;
    }

    getUsername(): string {
        let defaultUsername = this.isAuthenticated() ? 'User' : 'Anonymous';
        return window.localStorage.getItem(this.LOCALSTORAGE_USERNAME_KEY) || defaultUsername;
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    login(username: string, password: string): Observable<any> {
        let body = JSON.stringify({
            'username': username,
            'password': password
        });
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        let url = `${apiHost}/api-token-auth/`;
        return this.http.post(url, body, options).map(response => {
            let token = response.json().token;
            this.setUsername(username);
            this.setToken(token);
        });
    }

    logout(redirectTo: string = '/login') {
        this.setToken(null);
        this.setUsername(null);
        if (redirectTo) {
            this.router.navigate([redirectTo]);
        }
    }

    private setToken(token: string | null) {
        this.setLocalStorageValue(this.LOCALSTORAGE_TOKEN_KEY, token);
    }

    private setUsername(username: string | null) {
        this.setLocalStorageValue(this.LOCALSTORAGE_USERNAME_KEY, username);
    }

    private setLocalStorageValue(key: string, value: string | null) {
        if (value) {
            window.localStorage.setItem(key, value);
        } else {
            window.localStorage.removeItem(key);
        }
    }
}