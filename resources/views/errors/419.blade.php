@extends('errors::minimal')

@section('title', __('Session Expired'))
@section('code', '419')
@section('message', __('This page was open for too long and its security token expired.'))
@section('hint', __('Go back, reload the page and try again. Nothing was saved.'))
@section('icon', 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z')
