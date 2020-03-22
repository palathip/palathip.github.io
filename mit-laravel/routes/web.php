<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Route::get('/hello', function () {
    return 'Hello laravel 7';
});

Route::get('/hello/world', function () {
    return 'Hello laravel 7';
});

Route::get('/hello/world/haha', function () {
    return 'Hello laravel 7';
});


