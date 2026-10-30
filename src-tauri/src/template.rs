//! Filename templates such as `{uploader} - {title}`, translated to yt-dlp's output syntax.

pub const DEFAULT: &str = "{title} [{id}]";

/// Characters Windows refuses in file names; rejected everywhere so a template that works
/// on one system works on all of them. `/` is allowed and creates sub-folders.
const FORBIDDEN: &[char] = &['\\', ':', '*', '?', '"', '<', '>', '|'];

fn field(token: &str) -> Option<&'static str> {
    Some(match token {
        "title" => "%(title).150B",
        "id" => "%(id)s",
        "uploader" => "%(uploader|Unknown).100B",
        "channel" => "%(channel|Unknown).100B",
        "date" => "%(upload_date>%Y-%m-%d|Unknown)s",
        "year" => "%(upload_date>%Y|Unknown)s",
        _ => return None,
    })
}

/// Returns yt-dlp's output template (without the extension) for a user template.
pub fn render(template: &str) -> Result<String, String> {
    let mut out = String::new();
    let mut rest = template;
    let mut has_unique = false;

    while let Some(c) = rest.chars().next() {
        if c == '{' {
            let end = rest.find('}').ok_or("a { is missing its }")?;
            let token = &rest[1..end];
            out.push_str(field(token).ok_or_else(|| format!("unknown field {{{token}}}"))?);
            has_unique |= token == "title" || token == "id";
            rest = &rest[end + 1..];
            continue;
        }
        if c == '}' {
            return Err("a } has no matching {".into());
        }
        if FORBIDDEN.contains(&c) {
            return Err(format!("{c} cannot be used in a file name"));
        }
        // A literal percent sign must not be read as a yt-dlp field.
        out.push_str(if c == '%' { "%%" } else { &rest[..c.len_utf8()] });
        rest = &rest[c.len_utf8()..];
    }

    if !has_unique {
        return Err("include {title} or {id} so files do not overwrite each other".into());
    }
    if out.starts_with('/') || out.split('/').any(|s| s.is_empty() || s == "." || s == "..") {
        return Err("folders must be named and relative, like {uploader}/{title}".into());
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_fields() {
        assert_eq!(
            render("{uploader} - {title}").unwrap(),
            "%(uploader|Unknown).100B - %(title).150B"
        );
        assert_eq!(render(DEFAULT).unwrap(), "%(title).150B [%(id)s]");
    }

    #[test]
    fn escapes_percent_signs() {
        assert_eq!(render("100% {id}").unwrap(), "100%% %(id)s");
    }

    #[test]
    fn allows_subfolders() {
        assert_eq!(render("{channel}/{title}").unwrap(), "%(channel|Unknown).100B/%(title).150B");
    }

    #[test]
    fn rejects_bad_templates() {
        for bad in [
            "{nope} {id}",
            "{title",
            "title}",
            "{title}?",
            "no fields",
            "../{title}",
            "/{title}",
            "{channel}//{title}",
            "{title}/",
        ] {
            assert!(render(bad).is_err(), "{bad} should be rejected");
        }
    }
}
