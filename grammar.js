/**
 * @file daslang grammar for tree-sitter
 * @author Gaijin Entertainment
 * @author Anton Zinovyev <xog3@yandex.ru>
 * @license BSD-3-Clause
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// constraint: the compiler lexer (src/parser/ds2_lexer.lpp) reads each of these words as a keyword and never as a name
const KEYWORDS = [
  'module', 'public', 'private', 'shared', 'inscope', 'options', 'require', 'as', 'expect', 'type', 'in', 'default',
  'true', 'false',
];

/**
 * @param {RuleOrLiteral} rule
 * @param {RuleOrLiteral} separator
 */
function sepBy1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

export default grammar({
  name: 'daslang',

  externals: $ => [
    $._newline_semicolon,
    $._newline_comma,
    $._open_paren,
    $._close_paren,
    $._open_bracket,
    $._close_bracket,
    $._safe_open_bracket,
    $._not_open_bracket,
    $._not_safe_open_bracket,
    $._block_open,
    $._list_open,
    $._table_open,
    $._brace_open,
    $._close_brace,
    $._interpolation_open,
    $._interpolation_close,
    $._string_content,
    $.escape_sequence,
    $._format_string,
    $._reader_body,
    $._keyword_start,
    $._keyword_end,
    $._at_field,
    $._tag_e,
    $._tag_i,
    $._tag_v,
    $._tag_b,
    $._tag_a,
    $._tag_t,
    $._tag_c,
    $._tag_f,
    $._not_is,
    $._not_as,
    $._not_safe_as,
    $._map_to,
    $._integer,
    $._unsigned_integer,
    $._long_integer,
    $._long_integer_min,
    $._unsigned_long_integer,
    $._unsigned_int8,
    $._float,
    $._double,
    $._float16,
    $.block_comment,
    $._lexer_error,
    $._error_sentinel,
  ],

  extras: $ => [/[ \t\r\n]/, /\\[ \t\r]*\n/, $.comment, $.block_comment, $.line_directive],

  word: $ => $.identifier,

  reserved: {
    global: _ => KEYWORDS,
  },

  rules: {
    source_file: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $.module_declaration,
      $.expect_declaration,
      seq($.require_declaration, $._semicolon),
      seq($.options_declaration, $._semicolon),
      $._semicolon,
    ),

    _semicolon: $ => choice(';', $._newline_semicolon),

    module_declaration: $ => seq(
      'module',
      field('name', choice($.identifier, '$')),
      optional(field('shared', 'shared')),
      optional(field('visibility', choice('public', 'private'))),
      optional(field('visible_everywhere', seq('!', 'inscope'))),
    ),

    options_declaration: $ => seq('options', sepBy1($.annotation_argument, ',')),

    require_declaration: $ => seq(
      'require',
      optional(field('guard', seq('?', $.module_path))),
      choice(
        seq(field('name', $.module_path), optional(seq('as', field('alias', $.identifier)))),
        seq(alias($._open_bracket, '['), field('group', $.identifier), alias($._close_bracket, ']')),
      ),
      optional(field('public', 'public')),
    ),

    // constraint: the compiler continues a path at each `.` or `/` after a name, also the path of a require guard
    module_path: $ => prec.right(seq(
      repeat(choice('%', seq(choice('.', '..', '%'), '/'))),
      sepBy1($.identifier, choice('.', '/')),
    )),

    expect_declaration: $ => seq('expect', sepBy1($.expected_error, ',')),

    expected_error: $ => seq(
      field('code', alias($._integer, $.constant_integer)),
      optional(seq(':', field('count', alias($._integer, $.constant_integer)))),
    ),

    annotation_argument: $ => seq(
      field('name', choice($.identifier, 'type', 'in', 'default')),
      optional(seq(
        '=',
        field('value', choice(
          $._annotation_argument_value,
          seq('@@', $.identifier),
          seq(
            alias($._open_paren, '('),
            sepBy1($._annotation_argument_value, ','),
            alias($._close_paren, ')'),
          ),
        )),
      )),
    ),

    _annotation_argument_value: $ => choice(
      $.constant_string,
      $.identifier,
      alias($._integer, $.constant_integer),
      alias($._long_integer, $.constant_integer64),
      alias($._unsigned_long_integer, $.constant_unsigned_integer64),
      alias($._float, $.constant_float),
      $.constant_boolean,
      seq('-', choice(
        alias($._integer, $.constant_integer),
        alias($._long_integer, $.constant_integer64),
        alias($._long_integer_min, $.constant_integer64),
        alias($._float, $.constant_float),
      )),
    ),

    constant_boolean: _ => choice('true', 'false'),

    constant_string: $ => seq('"', repeat(choice($._string_content, $.escape_sequence)), '"'),

    identifier: _ => /[_a-zA-Z][_a-zA-Z0-9`]*/,

    comment: _ => token(seq('//', /.*/)),

    line_directive: _ => token(seq('#', /[0-9]+/, ',', /[0-9]+/, ',', /"[^"]+"/, '#')),
  },
});
